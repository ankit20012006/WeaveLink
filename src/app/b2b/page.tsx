"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { products } from "@/data/mock";
import { formatINR } from "@/lib/utils";
import { Building2, FileText, Send } from "lucide-react";

export default function B2BPage() {
  const [selected, setSelected] = useState(products[1].id);
  const [qty, setQty] = useState(24);
  const [sent, setSent] = useState(false);
  const product = products.find((p) => p.id === selected) ?? products[1];
  const estimate = product.bulkPrice * qty;

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

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-4">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelected(p.id);
                setQty(p.moq);
                setSent(false);
              }}
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
          <p className="mt-2 text-sm text-muted">{product.title}</p>

          <label className="mt-6 block text-xs text-muted">
            Quantity (min {product.moq})
            <input
              type="number"
              min={product.moq}
              value={qty}
              onChange={(e) =>
                setQty(Math.max(product.moq, Number(e.target.value) || product.moq))
              }
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-mist px-3 py-2.5 text-sm text-ink"
            />
          </label>

          <label className="mt-4 block text-xs text-muted">
            Buyer organization
            <input
              type="text"
              defaultValue="Aarohi Design Co."
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-mist px-3 py-2.5 text-sm text-ink"
            />
          </label>

          <label className="mt-4 block text-xs text-muted">
            Notes / sample request
            <textarea
              rows={3}
              defaultValue="Need sample stole in indigo + quote for hotel amenity kits. Prefer NFC tags."
              className="mt-1 w-full resize-none rounded-xl border border-[var(--line)] bg-mist px-3 py-2.5 text-sm text-ink"
            />
          </label>

          <div className="mt-6 rounded-2xl bg-mist p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Est. bulk total</span>
              <span className="font-semibold text-ink">{formatINR(estimate)}</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              Pricing tiers & collective bargaining for cooperatives appear here
              after backend wiring.
            </p>
          </div>

          {sent ? (
            <div className="mt-6 rounded-2xl bg-loom-soft p-4 text-sm text-loom">
              RFQ sent to the weaver / cooperative inbox (demo). They’ll reply
              with sample availability and firm quote.
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSent(true)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo px-5 py-3 text-sm font-medium text-paper"
            >
              <Send size={15} />
              Submit RFQ
            </button>
          )}

          <Link
            href={`/product/${product.id}`}
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
