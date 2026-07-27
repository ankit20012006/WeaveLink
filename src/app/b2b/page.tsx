"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  FileText,
  Send,
  ShieldAlert,
  WifiOff,
  CloudUpload,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import {
  createRFQ,
  fallbackCatalogProducts,
  listCatalogProducts,
  type RFQRecord,
} from "@/lib/weavelink-api";
import { products as fallbackProducts, type Product } from "@/data/mock";

const TIER_OPTIONS = [
  { minQty: 0, discount: 1, label: "Base unit rate" },
  { minQty: 24, discount: 0.95, label: "Small bulk" },
  { minQty: 40, discount: 0.9, label: "Bulk" },
  { minQty: 80, discount: 0.83, label: "Co-op volume" },
] as const;

const SAMPLE_FEE = 1200;
const QUEUE_STORAGE_KEY = "weavelink-rfq-queue";

type QueuedRFQ = Omit<RFQRecord, "status"> & { status: "submitted" };
type SyncLogLevel = "info" | "success" | "warning" | "error";
type SyncLogEntry = {
  id: string;
  at: string;
  level: SyncLogLevel;
  message: string;
};

export default function B2BPage() {
  const defaultProduct = (fallbackProducts[1] ?? fallbackProducts[0]) as Product;
  const [products, setProducts] = useState<Product[]>(fallbackCatalogProducts());
  const [selected, setSelected] = useState<string>(defaultProduct.id);
  const [qty, setQty] = useState(24);
  const [buyer, setBuyer] = useState("Aarohi Design Co.");
  const [notes, setNotes] = useState(
    "Need sample stole in indigo + quote for hotel amenity kits. Prefer NFC tags.",
  );
  const [includeSample, setIncludeSample] = useState(true);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [didSubmitFail, setDidSubmitFail] = useState(false);
  const [isApiEnabled, setIsApiEnabled] = useState(true);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [queuedRfqs, setQueuedRfqs] = useState<QueuedRFQ[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === selected) ?? products[0],
    [products, selected],
  );

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const catalogProducts = await listCatalogProducts();
        if (!isMounted) return;
        setProducts(catalogProducts);
        setIsApiEnabled(true);
      } catch {
        if (!isMounted) return;
        setProducts(fallbackCatalogProducts());
        setIsApiEnabled(false);
      }
    };

    const loadQueue = () => {
      if (typeof window === "undefined") return;

      try {
        const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as QueuedRFQ[];
        setQueuedRfqs(Array.isArray(parsed) ? parsed : []);
      } catch {
        setQueuedRfqs([]);
      }
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== "undefined") {
      setIsOnline(window.navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    loadQueue();
    loadProducts();

    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queuedRfqs));
    } catch {
      // keep flow resilient if browser storage is unavailable
    }
  }, [queuedRfqs]);

  useEffect(() => {
    if (!selectedProduct) return;
    setQty(selectedProduct.moq);
    setSent(false);
  }, [selectedProduct]);

  const minimumReached = useMemo(() => {
    if (!selectedProduct) return true;
    return qty >= selectedProduct.moq;
  }, [qty, selectedProduct]);

  const addSyncLog = (message: string, level: SyncLogLevel = "info") => {
    setSyncLogs((current) => {
      const entry: SyncLogEntry = {
        id: `sync-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        at: new Date().toISOString(),
        level,
        message,
      };
      return [...current, entry].slice(-8);
    });
  };

  const tier = [...TIER_OPTIONS]
    .sort((a, b) => b.minQty - a.minQty)
    .find((entry) => qty >= entry.minQty) ?? TIER_OPTIONS[0];

  const effectiveUnitPrice = useMemo(
    () => Math.max(Math.round(selectedProduct.bulkPrice * tier.discount), 1),
    [selectedProduct.bulkPrice, tier.discount],
  );

  const sampleFee = useMemo(() => (includeSample ? SAMPLE_FEE : 0), [includeSample]);
  const estimate = useMemo(
    () => effectiveUnitPrice * qty + sampleFee,
    [effectiveUnitPrice, qty, sampleFee],
  );

  const submitRfq = async () => {
    if (!selectedProduct || minimumReached === false) {
      setErrorMessage(
        `Quantity must be at least ${selectedProduct?.moq ?? 0} pieces for ${selectedProduct?.title ?? "this product"}`,
      );
      return;
    }

    const rfqPayload = {
      productId: selectedProduct.id,
      buyer,
      quantity: qty,
      notes: `${notes}${includeSample ? " [Sample requested]" : ""}`.trim(),
    };

    setIsSubmitting(true);
    setErrorMessage("");
    setDidSubmitFail(false);
    addSyncLog(
      `Submitting RFQ for ${selectedProduct.title} (${qty} pcs) to API...`,
      "info",
    );
    try {
      await createRFQ(rfqPayload);
      setSent(true);
      setSyncMessage("RFQ successfully sent to weaver.");
      setDidSubmitFail(false);
      addSyncLog(`RFQ submit success for ${selectedProduct.title}.`, "success");
    } catch {
      setDidSubmitFail(true);
      const queuedEntry: QueuedRFQ = {
        id: `RFQ-LOCAL-${Date.now()}`,
        productId: selectedProduct.id,
        productTitle: selectedProduct.title,
        buyer,
        quantity: qty,
        notes: rfqPayload.notes,
        estimatedTotal: estimate,
        status: "submitted",
        createdAt: new Date().toISOString(),
      };
      setQueuedRfqs((current) => [...current, queuedEntry]);
      setSent(true);
      setSyncMessage(
        "Network unavailable. RFQ saved locally and will sync when online.",
      );
      setErrorMessage("Could not reach API. RFQ queued locally.");
      addSyncLog(
        `RFQ queued for retry: ${queuedEntry.id} · ${selectedProduct.title}`,
        "warning",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const syncQueue = async () => {
    if (!isOnline || queuedRfqs.length === 0 || isSyncingQueue) return;

    setIsSyncingQueue(true);
    setSyncMessage("Syncing queued RFQs to API...");
    addSyncLog(`Starting sync for ${queuedRfqs.length} queued RFQ(s).`, "info");

    const nextQueue: QueuedRFQ[] = [];
    let synced = 0;

    for (const entry of queuedRfqs) {
      try {
        await createRFQ({
          productId: entry.productId,
          buyer: entry.buyer,
          quantity: entry.quantity,
          notes: entry.notes,
        });
        synced += 1;
        addSyncLog(`Synced queued RFQ ${entry.id}.`, "success");
      } catch {
        nextQueue.push(entry);
        addSyncLog(`Could not sync queued RFQ ${entry.id}, kept offline.`, "warning");
      }
    }

    setQueuedRfqs(nextQueue);
    setSyncMessage(
      nextQueue.length === 0
        ? "All queued RFQs synced in demo mode."
        : `Synced ${synced} RFQ${synced === 1 ? "" : "s"}, ${nextQueue.length} still queued.`,
    );
    addSyncLog(
      nextQueue.length === 0
        ? "Queued RFQ sync completed. All items cleared."
        : `Queued RFQ sync partially complete. ${nextQueue.length} item(s) still queued.`,
      nextQueue.length === 0 ? "success" : "warning",
    );
    setIsSyncingQueue(false);
  };

  if (!selectedProduct) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
          Dual marketplace
        </p>
        <h1 className="mt-2 font-display text-4xl text-indigo">
          B2B bulk desk
        </h1>
        <p className="mt-3 text-muted">
          MOQ, sample requests, and RFQ for boutiques, D2C brands, and
          institutional gifting — same authenticated inventory as retail.
        </p>
      </div>

      <div className="mt-8 flex items-center gap-2 rounded-full bg-indigo-soft/70 px-3 py-2 text-xs text-indigo-mid">
        <WifiOff size={13} />
        {isOnline ? "Online mode" : "Offline queue mode: RFQ drafts will sync on reconnect"}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-4">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`flex w-full gap-4 rounded-2xl border p-3 text-left transition ${
                selected === p.id
                  ? "border-indigo bg-indigo-soft/40 shadow-[var(--shadow)]"
                  : "border-[var(--line)] bg-paper hover:border-indigo/20"
              }`}
            >
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-cotton">
                <Image
                  src={p.images[0]}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate font-medium text-ink">{p.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {p.cluster} · MOQ {p.moq}
                </p>
                <p className="mt-2 text-sm font-semibold text-indigo">
                  {formatINR(p.bulkPrice)}
                  <span className="font-normal text-muted"> / unit bulk</span>
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-[1.5rem] border border-[var(--line)] bg-paper p-6 shadow-[var(--shadow)] sm:p-8">
          <div className="flex items-center gap-2 text-indigo">
            <Building2 size={18} />
            <h2 className="font-display text-2xl">Request for quotation</h2>
          </div>
          <p className="mt-2 text-sm text-muted">{selectedProduct.title}</p>

          {!isApiEnabled && (
            <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">
              Demo fallback mode: RFQ submit runs locally while API is unreachable.
            </p>
          )}

          <label className="mt-6 block text-xs text-muted">
            Quantity (min {selectedProduct.moq})
            <input
              type="number"
              min={selectedProduct.moq}
              value={qty}
              onChange={(event) =>
                setQty(Math.max(selectedProduct.moq, Number(event.target.value) || selectedProduct.moq))
              }
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-mist px-3 py-2.5 text-sm text-ink"
            />
          </label>
          {!minimumReached ? (
            <p className="mt-2 text-xs text-lac">
              Minimum quantity for this listing is {selectedProduct.moq}.
            </p>
          ) : null}

          <label className="mt-4 block text-xs text-muted">
            Buyer organization
            <input
              type="text"
              value={buyer}
              onChange={(event) => setBuyer(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-mist px-3 py-2.5 text-sm text-ink"
            />
          </label>

          <label className="mt-4 block text-xs text-muted">
            Notes / sample request
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 w-full resize-none rounded-xl border border-[var(--line)] bg-mist px-3 py-2.5 text-sm text-ink"
            />
          </label>

          <label className="mt-4 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={includeSample}
              onChange={(event) => setIncludeSample(event.target.checked)}
            />
            Request sample dispatch (sample fee added)
          </label>

          <div className="mt-6 rounded-2xl bg-mist p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Pricing tier</span>
              <span className="font-semibold text-ink">{tier.label}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted">Unit price</span>
              <span className="font-semibold text-ink">
                {formatINR(effectiveUnitPrice)}
              </span>
            </div>
            {includeSample ? (
              <p className="mt-1 text-xs text-muted">
                + {formatINR(SAMPLE_FEE)} sample dispatch fee
              </p>
            ) : null}
            <p className="mt-3 flex justify-between text-sm">
              <span className="text-muted">Estimated total</span>
              <span className="font-semibold text-ink">{formatINR(estimate)}</span>
            </p>
          </div>

          {errorMessage && (
            <p className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <span className="inline-flex items-center gap-2">
                <AlertCircle size={14} />
                {errorMessage}
              </span>
            </p>
          )}

          {syncMessage ? (
            <p className="mt-4 rounded-2xl bg-loom-soft px-3 py-2 text-xs text-ink">
              {syncMessage}
            </p>
          ) : null}

          {sent ? (
            <div className="mt-6 rounded-2xl bg-loom-soft p-4 text-sm text-loom">
              RFQ submitted to weaver / cooperative inbox.
              <br />
              You can submit more than one request from the same form.
              {didSubmitFail ? (
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setErrorMessage("");
                    void submitRfq();
                  }}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-paper px-4 py-2 text-xs font-medium text-indigo hover:border-indigo"
                >
                  Retry submit
                </button>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={submitRfq}
              disabled={isSubmitting || !minimumReached}
              className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-paper ${
                isSubmitting || !minimumReached
                  ? "cursor-not-allowed bg-indigo/65"
                  : "bg-indigo"
              }`}
            >
              <Send size={15} />
              {isSubmitting ? "Submitting..." : "Submit RFQ"}
            </button>
          )}

          <div className="mt-4 rounded-2xl bg-loom-soft/35 p-3 text-xs text-loom">
            <span className="inline-flex items-center gap-2">
              <CheckCircle size={14} />
              Current tier: {tier.label}
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-indigo/30 bg-mist p-4">
            <h3 className="text-sm font-medium text-indigo">Offline RFQ queue</h3>
            {queuedRfqs.length === 0 ? (
              <p className="mt-2 text-xs text-muted">
                No RFQs queued for sync.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-left text-sm">
                {queuedRfqs.map((queued) => (
                  <li
                    key={queued.id}
                    className="rounded-xl border border-[var(--line)] bg-paper px-3 py-2"
                  >
                    <p className="font-medium text-ink">{queued.productTitle}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {queued.quantity} pcs · {queued.buyer} · {queued.id}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={syncQueue}
              disabled={!isOnline || isSyncingQueue || queuedRfqs.length === 0}
              className={`mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-paper ${
                !isOnline || isSyncingQueue || queuedRfqs.length === 0
                  ? "cursor-not-allowed bg-indigo/65"
                  : "bg-indigo"
              }`}
            >
              <CloudUpload size={14} />
              {isSyncingQueue ? "Syncing..." : "Sync queued RFQs"}
            </button>
          </div>

          <div className="mt-3 rounded-2xl bg-paper p-3">
            <h3 className="text-sm font-medium text-indigo">RFQ sync log</h3>
            {syncLogs.length === 0 ? (
              <p className="mt-2 text-xs text-muted">
                No sync attempts yet. Failed submits and sync retries will appear here.
              </p>
            ) : (
              <ul className="mt-2 space-y-2 text-xs text-muted">
                {syncLogs.map((entry) => (
                  <li
                    key={entry.id}
                    className={`rounded-lg border px-3 py-2 ${
                      entry.level === "success"
                        ? "border-loom/30 bg-loom-soft text-ink"
                        : entry.level === "warning"
                          ? "border-warp-gold/40 bg-warp-gold-soft text-ink"
                          : entry.level === "error"
                            ? "border-lac/45 bg-lac-soft text-lac"
                            : "border-[var(--line)] bg-cotton text-ink"
                    }`}
                  >
                    <p>{entry.message}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {new Date(entry.at).toLocaleTimeString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-[var(--line)] bg-paper p-3 text-xs text-muted">
              <span className="inline-flex items-center gap-2">
                <ShieldAlert size={14} />
                Your queue will sync automatically when the API is available.
              </span>
            </p>
          ) : null}

          <Link
            href={`/product/${selectedProduct.id}`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-indigo"
          >
            <FileText size={14} />
            Open retail product page
          </Link>
        </div>
      </div>
    </div>
  );
}
