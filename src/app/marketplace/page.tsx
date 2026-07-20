"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { clusters, products, techniques } from "@/data/mock";
import { ShieldCheck } from "lucide-react";

export default function MarketplacePage() {
  const [cluster, setCluster] = useState<(typeof clusters)[number]>("All clusters");
  const [technique, setTechnique] =
    useState<(typeof techniques)[number]>("All techniques");
  const [authOnly, setAuthOnly] = useState(true);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (authOnly && !p.authenticated) return false;
      if (cluster !== "All clusters" && p.cluster !== cluster) return false;
      if (technique !== "All techniques" && p.technique !== technique)
        return false;
      return true;
    });
  }, [cluster, technique, authOnly]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
          B2C storefront
        </p>
        <h1 className="mt-2 font-display text-4xl text-indigo">
          Marketplace
        </h1>
        <p className="mt-3 text-muted">
          Filter by cluster, technique, and authenticity. Every listing below
          carries a Digital Product Passport in the full flow.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-paper p-4 sm:flex-row sm:items-center sm:flex-wrap">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Cluster / GI
          <select
            value={cluster}
            onChange={(e) =>
              setCluster(e.target.value as (typeof clusters)[number])
            }
            className="min-w-[160px] rounded-xl border border-[var(--line)] bg-mist px-3 py-2 text-sm text-ink"
          >
            {clusters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Technique
          <select
            value={technique}
            onChange={(e) =>
              setTechnique(e.target.value as (typeof techniques)[number])
            }
            className="min-w-[180px] rounded-xl border border-[var(--line)] bg-mist px-3 py-2 text-sm text-ink"
          >
            {techniques.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setAuthOnly((v) => !v)}
          className={`mt-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            authOnly
              ? "bg-loom-soft text-loom"
              : "bg-cotton text-muted"
          }`}
        >
          <ShieldCheck size={15} />
          Authenticated only
        </button>
      </div>

      <p className="mt-6 text-sm text-muted">
        Showing {filtered.length} piece{filtered.length === 1 ? "" : "s"}
      </p>

      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
