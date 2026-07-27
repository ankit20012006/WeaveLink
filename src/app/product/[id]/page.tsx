import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  MessageCircle,
  QrCode,
  Sparkles,
} from "lucide-react";
import { AuthenticityBadge } from "@/components/AuthenticityBadge";
import { formatINR } from "@/lib/utils";
import {
  type Product,
  type Weaver,
  getCatalogProduct,
  getSellerWeaver,
  verifyProductBySerial,
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

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let product: Product | null = null;
  let passportStatus: "authenticated" | "revoked" | "pending" = "pending";
  let weaver: Weaver | null = null;

  try {
    product = await withApiTimeout(
      getCatalogProduct(id),
      "catalog product lookup",
    );
  } catch {
    notFound();
  }

  if (!product) notFound();
  weaver = await withApiTimeout(
    getSellerWeaver(product.weaverId),
    "seller lookup",
  ).catch(() => null);

  try {
    const verification = await withApiTimeout(
      verifyProductBySerial(product.serial),
      "passport verification",
    );
    passportStatus = verification.passportStatus === "valid" ? "authenticated" : "revoked";
  } catch {
    passportStatus = product.authenticated ? "authenticated" : "pending";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-indigo"
      >
        <ArrowLeft size={14} />
        Marketplace
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-cotton shadow-[var(--shadow)]">
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width:1024px) 100vw, 50vw"
            />
          </div>
          {product.images[1] && (
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-cotton">
              <Image
                src={product.images[1]}
                alt={`${product.title} detail`}
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
            </div>
          )}
        </div>

        <div>
          <AuthenticityBadge
            status={passportStatus}
          />
          {passportStatus !== "authenticated" ? (
            <p className="mt-2 text-sm text-lac">
              This listing shows a {passportStatus === "revoked" ? "revoked" : "pending"} passport status.
            </p>
          ) : null}
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted">
            {product.cluster}
            {product.gi ? ` · GI ${product.gi}` : ""}
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-indigo sm:text-4xl">
            {product.title}
          </h1>
          <p className="mt-4 text-2xl font-semibold text-ink">
            {formatINR(product.price)}
          </p>
          <p className="mt-1 text-sm text-muted">
            Bulk from {formatINR(product.bulkPrice)} · MOQ {product.moq}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-indigo-soft px-3 py-1 text-xs text-indigo-mid"
              >
                {tag}
              </span>
            ))}
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-[var(--line)] bg-paper p-5 text-sm">
            <div>
              <dt className="text-muted">Technique</dt>
              <dd className="mt-0.5 font-medium text-ink">{product.technique}</dd>
            </div>
            <div>
              <dt className="text-muted">Materials</dt>
              <dd className="mt-0.5 font-medium text-ink">{product.materials}</dd>
            </div>
            <div>
              <dt className="text-muted">Loom</dt>
              <dd className="mt-0.5 font-medium text-ink">{product.loomType}</dd>
            </div>
            <div>
              <dt className="text-muted">Made</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {product.productionRange}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-indigo px-5 py-3 text-sm font-medium text-paper"
            >
              Buy now
            </button>
            <Link
              href="/b2b"
              className="inline-flex items-center gap-2 rounded-full border border-indigo/20 bg-paper px-5 py-3 text-sm font-medium text-indigo"
            >
              <Building2 size={15} />
              Request bulk quote
            </Link>
            <Link
              href={`/verify/${product.serial}`}
              className="inline-flex items-center gap-2 rounded-full border border-loom/25 bg-loom-soft px-5 py-3 text-sm font-medium text-loom"
            >
              <QrCode size={15} />
              Verify passport
            </Link>
          </div>

          <section className="mt-10">
            <div className="flex items-center gap-2 text-loom">
              <Sparkles size={16} />
              <h2 className="font-display text-2xl text-indigo">
                {product.storyTitle}
              </h2>
            </div>
            <p className="mt-3 text-base leading-relaxed text-ink/90">
              {product.story}
            </p>
          </section>

          {weaver && (
            <section className="mt-8 flex gap-4 rounded-2xl bg-mist p-5">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-cotton">
                <Image
                  src={weaver.photo}
                  alt={weaver.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                  Meet the weaver
                </p>
                <p className="font-display text-xl text-indigo">{weaver.name}</p>
                <p className="text-sm text-muted">
                  {weaver.cluster} · {weaver.years} years ·{" "}
                  {weaver.verified ? "Verified weaver" : "Pending KYC"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink/80">
                  {weaver.bio}
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo"
                >
                    <MessageCircle size={14} />
                  Send a voice note
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
