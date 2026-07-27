import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/mock";
import { getWeaver } from "@/data/mock";
import { formatINR } from "@/lib/utils";
import { AuthenticityBadge } from "./AuthenticityBadge";

export function ProductCard({ product }: { product: Product }) {
  const weaver = getWeaver(product.weaverId);

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block overflow-hidden rounded-2xl bg-paper shadow-[var(--shadow)] transition duration-300 hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-cotton">
        <Image
          src={product.images[0]}
          alt={product.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(max-width:768px) 100vw, 33vw"
        />
        <div className="absolute left-3 top-3">
          <AuthenticityBadge
            compact
            status={product.authenticated ? "authenticated" : "revoked"}
          />
        </div>
        {product.status === "in-production" && (
          <span className="absolute right-3 top-3 rounded-full bg-paper/95 px-2 py-0.5 text-[11px] text-muted">
            In production
          </span>
        )}
      </div>
      <div className="space-y-2 p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
          {product.cluster}
          {product.gi ? ` · ${product.gi}` : ""}
        </p>
        <h3 className="font-display text-lg leading-snug text-ink group-hover:text-indigo">
          {product.title}
        </h3>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-indigo">
              {formatINR(product.price)}
            </p>
            {weaver && (
              <p className="text-xs text-muted">by {weaver.name}</p>
            )}
          </div>
          <span className="text-xs text-loom">{product.technique}</span>
        </div>
      </div>
    </Link>
  );
}
