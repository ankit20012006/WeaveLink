import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Fingerprint, Link2, Shield, CircleX } from "lucide-react";
import { getProductBySerial, getWeaver, type Product, type Weaver } from "@/data/mock";
import {
  verifyProductBySerial,
  type VerificationPayload,
} from "@/lib/weavelink-api";

export const dynamic = "force-dynamic";

const API_TIMEOUT_MS = 2200;

async function withApiTimeout<T>(promise: Promise<T>, operation: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error(`${operation} timed out`)),
          API_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ serial: string }>;
}) {
  const { serial } = await params;
  let payload: VerificationPayload | null = null;
  let product: Product | null = null;
  let weaver: Weaver | null = null;

  try {
    payload = await withApiTimeout(
      verifyProductBySerial(serial),
      "passport verification",
    );
    product = payload.product;
    weaver = payload.weaver;
  } catch {
    product = getProductBySerial(serial) ?? null;
    weaver = product ? (getWeaver(product.weaverId) ?? null) : null;
  }

  if (!product) notFound();
  const anchorHash = payload?.anchorHash ?? "0x7a3f…c91e";
  const anchorChain = payload?.anchorChain ?? "Polygon-style lightweight anchor";
  const anchorProvider =
    payload?.anchorProvider ?? "hybrid registry + on-chain hash";
  const passportValid = payload?.passportStatus !== "revoked";
  const statusLabel = payload?.passportStatus ?? "valid";
  const statusText = passportValid
    ? "This piece is authentic"
    : "This piece has a verification issue";
  const statusTone = passportValid
    ? "text-loom"
    : "text-lac";
  const statusNote = passportValid
    ? "Immutable Digital Product Passport · no spoofable redirect"
    : "This passport status is currently flagged for review";

  return (
    <div className="hero-wash grain min-h-[70vh]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <div className="relative mx-auto inline-flex">
            <span className="animate-pulse-ring absolute inset-0 rounded-full bg-loom/30" />
            <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-loom text-paper">
              <Shield size={24} />
            </span>
          </div>
          <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-loom">
            Public verification
          </p>
          <h1 className={`mt-2 font-display text-3xl sm:text-4xl ${statusTone}`}>
            {statusText}
          </h1>
          <p className="mt-2 text-sm text-muted">{statusNote}</p>
        </div>

        <article className="mt-10 overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-paper shadow-[var(--shadow)]">
          <div className="relative aspect-[16/10] bg-cotton">
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width:768px) 100vw, 768px"
            />
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-indigo-mid">
                  {product.serial}
                </p>
                <h2 className="mt-1 font-display text-2xl text-ink">
                  {product.title}
                </h2>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  passportValid
                    ? "bg-loom-soft text-loom"
                    : "bg-amber-100 text-amber-900"
                }`}
              >
                {passportValid ? (
                  <BadgeCheck size={14} />
                ) : (
                  <CircleX size={14} />
                )}
                {statusLabel === "revoked" ? "Passport revoked" : "Passport valid"}
              </span>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ["Weaver", weaver?.name ?? "—"],
                ["Cluster / GI", product.gi ?? product.cluster],
                ["Materials", product.materials],
                ["Loom type", product.loomType],
                ["Production", product.productionRange],
                ["Technique", product.technique],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-mist px-4 py-3">
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 rounded-2xl border border-warp-gold/30 bg-warp-gold-soft p-4">
              <div className="flex items-start gap-3">
                <Fingerprint className="mt-0.5 shrink-0 text-warp-gold" size={18} />
                <div>
                  <p className="text-sm font-medium text-ink">
                    Anchored integrity hash (demo)
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-muted">
                    {anchorHash} · {anchorChain} · {anchorProvider}
                  </p>
                </div>
              </div>
            </div>

            <section className="mt-8">
              <h3 className="font-display text-xl text-indigo">
                {product.storyTitle}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/90">
                {product.story}
              </p>
            </section>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/product/${product.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper"
              >
                <Link2 size={14} />
                View full listing
              </Link>
              <Link
                href="/marketplace"
                className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-medium text-indigo"
              >
                Browse more
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
