"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Camera,
  Languages,
  Mic,
  Sparkles,
  WifiOff,
  CloudUpload,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import {
  createProduct,
  createStoryDraft,
  uploadMedia,
} from "@/lib/weavelink-api";
import { VerificationQr } from "@/components/VerificationQr";

const languages = [
  "Tamil",
  "Hindi",
  "Odia",
  "Telugu",
  "Bengali",
  "Kannada",
  "Marathi",
  "Gujarati",
  "Malayalam",
  "English",
];

const steps = ["Language", "Capture", "AI draft", "Passport"] as const;

const MAX_RETRY_ATTEMPTS = 6;
const RETRY_BASE_MS = 3500;

const getClientRef = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};

type DraftItem = {
  id: string;
  language: string;
  mode: "voice" | "photo";
  title: string;
  category: string;
  suggestedPrice: string;
  tags: string;
  storySeed: string;
  createdAt: string;
  synced: boolean;
  productId?: string;
  retryCount: number;
  nextRetryAt: string | null;
  lastFailure?: string;
  clientRef: string;
  imageUrls: string[];
  audioUrl?: string;
};

type UploadedEvidence = {
  serial: string;
  imageUrls: string[];
  audioUrl?: string;
};

const STORAGE_KEY = "weavelink-listing-drafts";

function generateSerial() {
  const now = new Date();
  const paddedMonth = `${now.getMonth() + 1}`.padStart(2, "0");
  const paddedDay = `${now.getDate()}`.padStart(2, "0");
  const random = `${Math.floor(Math.random() * 899) + 100}`;
  return `WL-KAN-${now.getFullYear()}${paddedMonth}${paddedDay}-${random}`;
}

function parseSuggestedPrice(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 16500;
  }
  return parsed;
}

function draftToCreatePayload(draft: DraftItem) {
  const price = parseSuggestedPrice(draft.suggestedPrice);
  const tags = draft.tags
    .split(/[·,|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    title: draft.title.trim() || "Untitled handloom piece",
    price,
    bulkPrice: Math.max(Math.round(price * 0.82), 1),
    moq: 6,
    category: draft.category.trim() || "Saree",
    technique: "Seller-declared; verification pending",
    materials: "Seller-declared; verification pending",
    loomType: "Seller-declared; verification pending",
    cluster: "Seller-declared",
    gi: null,
    status: "available" as const,
    authenticated: false,
    serial: draft.id,
    images: draft.imageUrls,
    evidenceUrl: draft.audioUrl ?? draft.imageUrls[0] ?? null,
    originalAudioUrl: draft.audioUrl ?? null,
    story: draft.storySeed,
    storyTitle: "Journey of this piece",
    tags,
    productionRange: "2026",
    clientRef: draft.clientRef,
  };
}

function nextRetryAfter(attempt: number): number {
  const safeAttempt = Math.min(attempt, MAX_RETRY_ATTEMPTS);
  return RETRY_BASE_MS * 2 ** safeAttempt;
}

function isDueForRetry(item: DraftItem): boolean {
  if (item.synced) {
    return false;
  }

  if (item.retryCount >= MAX_RETRY_ATTEMPTS) {
    return false;
  }

  if (!item.nextRetryAt) {
    return true;
  }

  const nextRetryAtMs = new Date(item.nextRetryAt).getTime();
  return Number.isFinite(nextRetryAtMs) && nextRetryAtMs <= Date.now();
}

export default function SellPage() {
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState("Tamil");
  const [mode, setMode] = useState<"voice" | "photo">("voice");
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    category: "",
    suggestedPrice: "",
    tags: "handloom · seller-declared",
    storySeed: "",
  });
  const [passports, setPassports] = useState<string[]>([]);
  const [queuedDrafts, setQueuedDrafts] = useState<DraftItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.navigator.onLine;
  });
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [captureError, setCaptureError] = useState("");
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [pendingEvidence, setPendingEvidence] = useState<UploadedEvidence | null>(
    null,
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const unsyncedDrafts = useMemo(
    () => queuedDrafts.filter((item) => !item.synced),
    [queuedDrafts],
  );

  const dueDrafts = useMemo(
    () => unsyncedDrafts.filter(isDueForRetry),
    [unsyncedDrafts],
  );

  const syncQueue = async () => {
    if (!isOnline || dueDrafts.length === 0 || syncing) {
      return;
    }

    setSyncing(true);
    setSyncMessage("Syncing drafts to WeaveLink API...");

    let syncedCount = 0;
    let failedCount = 0;
    let exhaustedCount = 0;
    const nextDrafts = [...queuedDrafts];
    for (let index = 0; index < nextDrafts.length; index += 1) {
      const entry = nextDrafts[index];
      if (entry.synced || !isDueForRetry(entry)) {
        continue;
      }

      try {
        const created = await createProduct(draftToCreatePayload(entry));
        nextDrafts[index] = {
          ...entry,
          synced: true,
          productId: created.id,
          id: created.serial || entry.id,
          retryCount: 0,
          nextRetryAt: null,
          lastFailure: undefined,
        };
        syncedCount += 1;
      } catch (error) {
        const retryCount = Math.min(entry.retryCount + 1, MAX_RETRY_ATTEMPTS);
        const hasAttemptsLeft = retryCount < MAX_RETRY_ATTEMPTS;
        failedCount += 1;
        nextDrafts[index] = {
          ...entry,
          retryCount,
          nextRetryAt: hasAttemptsLeft
            ? new Date(Date.now() + nextRetryAfter(retryCount)).toISOString()
            : null,
          lastFailure:
            error instanceof Error
              ? error.message
              : "Unable to reach API for draft sync.",
        };
        if (!hasAttemptsLeft) {
          exhaustedCount += 1;
        }
      }
    }

    setQueuedDrafts(nextDrafts);
    setPassports(
      nextDrafts
        .filter((item) => item.synced)
        .map((item) => item.id)
        .slice(0, 8),
    );

    if (failedCount === 0) {
      setSyncMessage(
        `Synced ${syncedCount} listing${syncedCount === 1 ? "" : "s"} to the API.`,
      );
    } else if (syncedCount === 0) {
      setSyncMessage(
        exhaustedCount > 0
          ? "Some listings hit retry limit. Keep them saved and retry later."
          : "Could not reach API. Drafts stay queued offline — retry when backend is up.",
      );
    } else {
      setSyncMessage(
        `Synced ${syncedCount}, ${failedCount} still queued. Retry remaining drafts.`,
      );
    }

    setSyncing(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadQueue = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as DraftItem[];
        setQueuedDrafts(
          Array.isArray(parsed)
            ? parsed.map((item) => ({
                ...item,
                retryCount: item.retryCount ?? 0,
                nextRetryAt: item.nextRetryAt ?? null,
              }))
            : [],
        );
      } catch {
        setQueuedDrafts([]);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      void syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    loadQueue();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncQueue]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queuedDrafts));
    } catch {
      // keep flow resilient in restricted browser modes
    }
  }, [queuedDrafts]);

  useEffect(() => {
    if (!isOnline || syncing || dueDrafts.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      void syncQueue();
    }, RETRY_BASE_MS);

    return () => clearTimeout(timer);
  }, [isOnline, syncing, dueDrafts.length, syncQueue]);

  const toggleRecording = async () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      return;
    }
    try {
      setCaptureError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        setListening(false);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setDraft((current) => ({
          ...current,
          storySeed:
            current.storySeed ||
            `Original ${lang} voice note captured. Add the approved factual transcript here.`,
        }));
        setPendingEvidence(null);
      };
      recorder.start();
      setMode("voice");
      setListening(true);
    } catch (error) {
      setCaptureError(
        error instanceof Error ? error.message : "Microphone access failed.",
      );
    }
  };

  const uploadEvidence = async (
    serial: string,
  ): Promise<UploadedEvidence> => {
    const imageUrls: string[] = [];

    for (const [index, photo] of photos.entries()) {
      const response = await uploadMedia({
        file: photo,
        mediaType: "image",
        actorId: serial,
        filename: `${serial}-photo-${index + 1}`,
      });
      if (response.status !== "uploaded" || !response.url) {
        throw new Error(response.message || "Image upload failed.");
      }

      imageUrls.push(response.url);
    }

    let audioUrl: string | undefined;
    if (audioBlob) {
      const audioFile = new File([audioBlob], `${serial}-voice.webm`, {
        type: audioBlob.type || "audio/webm",
      });

      const response = await uploadMedia({
        file: audioFile,
        mediaType: "audio",
        actorId: serial,
        filename: audioFile.name,
      });
      if (response.status !== "uploaded" || !response.url) {
        throw new Error(response.message || "Audio upload failed.");
      }

      audioUrl = response.url;
    }

    return {
      serial,
      imageUrls,
      audioUrl,
    };
  };

  const uploadEvidenceIfNeeded = async (): Promise<UploadedEvidence> => {
    if (pendingEvidence) {
      return pendingEvidence;
    }

    const evidence = await uploadEvidence(generateSerial());
    setPendingEvidence(evidence);
    return evidence;
  };

  const generateAiDraft = async () => {
    if (uploadingEvidence || isAiDrafting) {
      return;
    }

    if (!audioBlob && photos.length === 0 && !draft.storySeed.trim()) {
      setCaptureError("Add photos, a voice note, or story context first.");
      return;
    }

    setIsAiDrafting(true);
    setCaptureError("");
    try {
      const evidence = await uploadEvidenceIfNeeded();
      const response = await createStoryDraft({
        photoUrls: evidence.imageUrls,
        seedText: draft.storySeed || undefined,
        language: lang,
        contextNotes: `Mode ${mode} | Category ${draft.category || "not set"}`,
        maxTags: 6,
      });
      if (response.status !== "ready") {
        throw new Error(response.message || "AI draft not available.");
      }

      setDraft((current) => ({
        ...current,
        title: current.title || response.storyTitle,
        storySeed: response.story,
        tags: response.tags.length
          ? response.tags.join(" · ")
          : current.tags,
      }));
      setSyncMessage("AI story draft generated. Review and approve details.");
      setPendingEvidence(evidence);
    } catch (error) {
      setCaptureError(
        error instanceof Error ? error.message : "AI draft generation failed.",
      );
    } finally {
      setIsAiDrafting(false);
    }
  };

  const addDraftToQueue = async () => {
    if (!audioBlob && photos.length === 0) {
      setCaptureError("Record a voice note or add product photos first.");
      setStep(1);
      return;
    }
    setUploadingEvidence(true);
    setCaptureError("");
    try {
      const evidence = await uploadEvidenceIfNeeded();

      const nextDraft: DraftItem = {
        id: evidence.serial,
        clientRef: getClientRef(),
        imageUrls: evidence.imageUrls,
        audioUrl: evidence.audioUrl,
        language: lang,
        mode,
        title: draft.title,
        category: draft.category,
        suggestedPrice: draft.suggestedPrice,
        tags: draft.tags,
        storySeed: draft.storySeed,
        createdAt: new Date().toISOString(),
        synced: false,
        retryCount: 0,
        nextRetryAt: null,
      };

      setQueuedDrafts((current) => [...current, nextDraft]);
      setPassports((current) => [nextDraft.id, ...current].slice(0, 8));
      setPendingEvidence(null);
      setStep(3);
    } catch (error) {
      setCaptureError(
        error instanceof Error ? error.message : "Evidence upload failed.",
      );
    }
    setUploadingEvidence(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
        Seller onboarding
      </p>
      <h1 className="mt-2 font-display text-4xl text-indigo">
        List with voice or photo
      </h1>
      <p className="mt-3 text-muted">
        Designed for rural smartphones and intermittent connectivity. This flow
        demonstrates low-friction input + offline draft queue + delayed sync.
      </p>

      <div className="mt-6 flex items-center gap-2 rounded-full bg-indigo-soft/70 px-3 py-2 text-xs text-indigo-mid">
        <WifiOff size={13} />
        {isOnline ? "Online mode" : "Offline-first mode: actions queue and sync when signal returns"}
      </div>

      <ol className="mt-8 flex gap-2">
        {steps.map((label, i) => (
          <li key={label} className="flex-1">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`w-full rounded-full px-2 py-2 text-center text-xs font-medium transition ${
                i === step
                  ? "bg-indigo text-paper"
                  : i < step
                    ? "bg-loom-soft text-loom"
                    : "bg-cotton text-muted"
              }`}
            >
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 min-h-[340px] rounded-[1.5rem] border border-[var(--line)] bg-paper p-6 shadow-[var(--shadow)] sm:p-8">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="lang"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="flex items-center gap-2 text-indigo">
                <Languages size={18} />
                <h2 className="font-display text-2xl">Choose your language</h2>
              </div>
              <p className="mt-2 text-sm text-muted">
                Choose the language used for the seller-approved record.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {languages.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      lang === l
                        ? "bg-indigo text-paper"
                        : "bg-mist text-ink hover:bg-indigo-soft"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-8 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper"
              >
                Continue in {lang}
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <h2 className="font-display text-2xl text-indigo">
                Capture the piece
              </h2>
              <p className="mt-2 text-sm text-muted">
                Speak a short description or upload 3–5 photos. WeaveLink drafts
                the catalog for you.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`rounded-2xl border p-5 text-left transition ${
                    mode === "voice"
                      ? "border-indigo bg-indigo-soft/50"
                      : "border-[var(--line)]"
                  }`}
                >
                  <Mic className={listening ? "text-lac" : "text-indigo"} />
                  <p className="mt-3 font-medium text-ink">Voice note</p>
                  <p className="mt-1 text-xs text-muted">
                    {listening
                      ? `Recording in ${lang} — tap to stop`
                      : audioBlob
                        ? "Voice note captured — tap to replace"
                        : "Tap to record"}
                  </p>
                </button>
                <label
                  className={`rounded-2xl border p-5 text-left transition ${
                    mode === "photo"
                      ? "border-indigo bg-indigo-soft/50"
                      : "border-[var(--line)]"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="sr-only"
        onChange={(event) => {
          setPendingEvidence(null);
          setMode("photo");
          setPhotos(Array.from(event.target.files ?? []).slice(0, 5));
        }}
                  />
                  <Camera className="text-indigo" />
                  <p className="mt-3 font-medium text-ink">Photo to catalog</p>
                  <p className="mt-1 text-xs text-muted">
                    {photos.length
                      ? `${photos.length} real photo${photos.length === 1 ? "" : "s"} selected`
                      : "Add front, back, detail and edge photos"}
                  </p>
                </label>
              </div>
              {audioPreviewUrl ? (
                <audio controls src={audioPreviewUrl} className="mt-4 w-full" />
              ) : null}
              {photos.length ? (
                <p className="mt-3 text-xs text-muted">
                  {photos.map((photo) => photo.name).join(" · ")}
                </p>
              ) : null}
              {captureError ? (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {captureError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!audioBlob && photos.length === 0}
                className="mt-8 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper"
              >
                Review factual listing fields
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="draft"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="text-warp-gold" size={18} />
                <h2 className="font-display text-2xl text-indigo">
                  Factual draft for approval
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted">
                Fill and approve every factual field. No GI, material or origin
                claim is inferred from media.
              </p>
              <div className="mt-6 space-y-3 rounded-2xl bg-mist p-5 text-sm">
                <Row
                  label="Title"
                  value={
                    <input
                      value={draft.title}
                      onChange={(event) =>
                        setDraft({ ...draft, title: event.target.value })
                      }
                      className="w-full rounded-lg border border-[var(--line)] bg-paper px-2 py-1 text-sm"
                    />
                  }
                />
                <Row
                  label="Category"
                  value={
                    <input
                      value={draft.category}
                      onChange={(event) =>
                        setDraft({ ...draft, category: event.target.value })
                      }
                      className="w-full rounded-lg border border-[var(--line)] bg-paper px-2 py-1 text-sm"
                    />
                  }
                />
                <Row
                  label="Suggested price"
                  value={
                    <input
                      value={draft.suggestedPrice}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          suggestedPrice: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-[var(--line)] bg-paper px-2 py-1 text-sm"
                    />
                  }
                />
                <Row
                  label="Tags"
                  value={
                    <input
                      value={draft.tags}
                      onChange={(event) =>
                        setDraft({ ...draft, tags: event.target.value })
                      }
                      className="w-full rounded-lg border border-[var(--line)] bg-paper px-2 py-1 text-sm"
                    />
                  }
                />
                <Row
                  label="Story seed"
                  value={
                    <textarea
                      value={draft.storySeed}
                      onChange={(event) =>
                        setDraft({ ...draft, storySeed: event.target.value })
                      }
                      rows={2}
                      className="w-full resize-none rounded-lg border border-[var(--line)] bg-paper px-2 py-1 text-sm"
                    />
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => void generateAiDraft()}
                disabled={uploadingEvidence || isAiDrafting}
                className="mt-8 rounded-full bg-warp-gold/90 px-5 py-2.5 text-sm font-medium text-paper"
              >
                {isAiDrafting
                  ? "Generating story with AI..."
                  : "Generate AI story draft"}
              </button>
              <button
                type="button"
                onClick={() => void addDraftToQueue()}
                disabled={uploadingEvidence || isAiDrafting}
                className="mt-4 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper"
              >
                {uploadingEvidence
                  ? "Uploading original evidence..."
                  : "Approve facts and upload evidence"}
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="passport"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-center"
            >
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-loom-soft text-loom">
                <Check size={28} />
              </span>
              <h2 className="mt-4 font-display text-2xl text-indigo">
                Passport created
              </h2>
              <p className="mt-2 text-sm text-muted">
                Latest queued serial:
              </p>
              <p className="mt-1 font-mono text-sm text-indigo-mid">
                {passports[0] ?? "—"}
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted">
                This QR opens the public evidence record after the listing is
                synced. It does not claim independent verification.
              </p>
              <div className="mt-6 inline-flex">
                <VerificationQr serial={passports[0] ?? "pending"} />
              </div>

              <div className="mt-6 text-left">
                {syncMessage ? (
                  <p className="mb-3 rounded-xl bg-loom-soft px-3 py-2 text-xs text-ink">
                    {syncMessage}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={syncQueue}
                  disabled={syncing || !isOnline || dueDrafts.length === 0}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-paper ${
                    syncing || !isOnline || dueDrafts.length === 0
                      ? "cursor-not-allowed bg-indigo/65"
                      : "bg-indigo"
                  }`}
                >
                  <CloudUpload size={15} />
                  {syncing ? "Syncing..." : "Sync queued listings"}
                </button>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-indigo">Queued drafts</h3>
                {queuedDrafts.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">
                    No queued drafts yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2 text-left">
                    {queuedDrafts.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-xl border border-[var(--line)] bg-mist px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-ink">{item.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {item.id} · {item.synced ? "Synced" : "Queued"}
                          {item.retryCount > 0 &&
                            ` · retries ${item.retryCount}/${MAX_RETRY_ATTEMPTS}`}
                        </p>
                        {item.lastFailure ? (
                          <p className="mt-0.5 text-xs text-rose-600">
                            {item.lastFailure}
                          </p>
                        ) : null}
                        {item.nextRetryAt ? (
                          <p className="mt-0.5 text-xs text-muted">
                            Next retry: {new Date(item.nextRetryAt).toLocaleTimeString()}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-medium text-indigo"
                >
                  <ClipboardCheck size={14} />
                  Open seller desk
                </Link>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper"
                >
                  List another product
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="w-32 shrink-0 text-muted">{label}</span>
      {value}
    </div>
  );
}
