"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Camera,
  Languages,
  Mic,
  QrCode,
  Sparkles,
  WifiOff,
  CloudUpload,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { createProduct } from "@/lib/weavelink-api";

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
    technique: "Korvai",
    materials: "Mulberry silk, zari",
    loomType: "Pit loom",
    cluster: "Kanchipuram",
    gi: "Kanchipuram Silk",
    status: "available" as const,
    authenticated: true,
    serial: draft.id,
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80",
    ],
    story: draft.storySeed,
    storyTitle: "Journey of this piece",
    tags,
    productionRange: "2026",
  };
}

export default function SellPage() {
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState("Tamil");
  const [mode, setMode] = useState<"voice" | "photo">("voice");
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState({
    title: "Temple Border Kanchipuram Silk Saree",
    category: "Saree",
    suggestedPrice: "₹16,000 – ₹19,500",
    tags: "silk · korvai · GI · authenticated",
    storySeed: 'Voice in Tamil: “This border took four days…”',
  });
  const [passports, setPassports] = useState<string[]>([]);
  const [queuedDrafts, setQueuedDrafts] = useState<DraftItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(window.navigator.onLine);
    const loadQueue = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as DraftItem[];
        setQueuedDrafts(Array.isArray(parsed) ? parsed : []);
      } catch {
        setQueuedDrafts([]);
      }
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    loadQueue();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queuedDrafts));
    } catch {
      // keep flow resilient in restricted browser modes
    }
  }, [queuedDrafts]);

  const unsyncedDrafts = useMemo(
    () => queuedDrafts.filter((item) => !item.synced),
    [queuedDrafts],
  );

  const addDraftToQueue = () => {
    const nextDraft: DraftItem = {
      id: generateSerial(),
      language: lang,
      mode,
      title: draft.title,
      category: draft.category,
      suggestedPrice: draft.suggestedPrice,
      tags: draft.tags,
      storySeed: draft.storySeed,
      createdAt: new Date().toISOString(),
      synced: false,
    };
    setQueuedDrafts((current) => [...current, nextDraft]);
    setPassports((current) => [nextDraft.id, ...current].slice(0, 8));
    setStep(3);
  };

  const syncQueue = async () => {
    if (!isOnline || unsyncedDrafts.length === 0) return;
    setSyncing(true);
    setSyncMessage("Syncing drafts to WeaveLink API...");

    let syncedCount = 0;
    let failedCount = 0;
    const nextDrafts = [...queuedDrafts];

    for (let index = 0; index < nextDrafts.length; index += 1) {
      const entry = nextDrafts[index];
      if (entry.synced) continue;

      try {
        const created = await createProduct(draftToCreatePayload(entry));
        nextDrafts[index] = {
          ...entry,
          synced: true,
          productId: created.id,
          id: created.serial || entry.id,
        };
        syncedCount += 1;
      } catch {
        failedCount += 1;
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
        "Could not reach API. Drafts stay queued offline — retry when backend is up.",
      );
    } else {
      setSyncMessage(
        `Synced ${syncedCount}, ${failedCount} still queued. Retry remaining drafts.`,
      );
    }
    setSyncing(false);
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
                Voice registration via BHASHINI / Indic speech models (demo).
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
                  onClick={() => {
                    setMode("voice");
                    setListening(true);
                    setTimeout(() => setListening(false), 2200);
                  }}
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
                      ? `Listening in ${lang}…`
                      : "Tap to simulate recording"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("photo")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    mode === "photo"
                      ? "border-indigo bg-indigo-soft/50"
                      : "border-[var(--line)]"
                  }`}
                >
                  <Camera className="text-indigo" />
                  <p className="mt-3 font-medium text-ink">Photo to catalog</p>
                  <p className="mt-1 text-xs text-muted">
                    Simulate 4 photos uploaded
                  </p>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraft({
                    ...draft,
                    storySeed: `Voice in ${lang}: “This border took four days…”`,
                  });
                  setStep(2);
                }}
                className="mt-8 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper"
              >
                Generate listing draft
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
                  AI draft ready
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted">
                Review and edit — weaver stays in control.
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
                onClick={addDraftToQueue}
                className="mt-8 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper"
              >
                Generate draft and move to passport step
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
                Static QR ready now. NFC tag fulfillment available for
                cooperatives. Queue entries sync once network is available.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-dashed border-indigo/30 bg-mist px-6 py-8">
                <QrCode size={64} className="text-indigo" />
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
                  disabled={syncing || !isOnline || unsyncedDrafts.length === 0}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-paper ${
                    syncing || !isOnline || unsyncedDrafts.length === 0
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
                        </p>
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
