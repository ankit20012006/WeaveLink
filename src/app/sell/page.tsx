"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Check,
  Languages,
  Mic,
  QrCode,
  Sparkles,
  WifiOff,
} from "lucide-react";
import Link from "next/link";

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

export default function SellPage() {
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState("Tamil");
  const [mode, setMode] = useState<"voice" | "photo">("voice");
  const [listening, setListening] = useState(false);

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
        is interactive demo UI — generation is simulated.
      </p>

      <div className="mt-6 flex items-center gap-2 rounded-full bg-indigo-soft/70 px-3 py-2 text-xs text-indigo-mid">
        <WifiOff size={13} />
        Offline-first: actions queue and sync when the signal returns
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
                onClick={() => setStep(2)}
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
                <Row label="Title" value="Temple Border Kanchipuram Silk Saree" />
                <Row label="Category" value="Saree · Bridal" />
                <Row label="Suggested price" value="₹16,000 – ₹19,500" />
                <Row
                  label="Tags"
                  value="silk · korvai · GI · authenticated"
                />
                <Row
                  label="Story seed"
                  value={`Voice in ${lang}: “This border took four days… grandmother’s motif book.”`}
                />
              </div>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="mt-8 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper"
              >
                Seal Digital Product Passport
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
              <p className="mt-2 font-mono text-sm text-indigo-mid">
                WL-KAN-2026-08499
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted">
                Static QR ready now. NFC tag fulfillment available for
                cooperatives. Hash queued for chain anchor (demo).
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-dashed border-indigo/30 bg-mist px-6 py-8">
                <QrCode size={64} className="text-indigo" />
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/verify/WL-KAN-2026-08421"
                  className="rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper"
                >
                  Preview verification page
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-medium text-indigo"
                >
                  Open seller desk
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="w-32 shrink-0 text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
