import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  CircleX,
  ExternalLink,
  Fingerprint,
  Link2,
  Shield,
} from "lucide-react";
import {
  type Product,
  type Weaver,
  verifyProductBySerial,
  type VerificationPayload,
} from "@/lib/weavelink-api";
import { VerificationQr } from "@/components/VerificationQr";

export const dynamic = "force-dynamic";

const API_TIMEOUT_MS = 15000;

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
  let errorMessage = "Backend unavailable or connectivity is unstable";

  try {
    payload = await withApiTimeout(
      verifyProductBySerial(serial),
      "passport verification",
    );
    product = payload.product;
    weaver = payload.weaver;
  } catch (error) {
    if (error instanceof Error && error.message) {
      errorMessage = error.message;
    }
  }

  if (!product || !weaver) {
    return (
      <div className="hero-wash grain min-h-[70vh]">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="text-center">
            <div className="relative mx-auto inline-flex">
              <span className="animate-pulse-ring absolute inset-0 rounded-full bg-warp-gold/30" />
              <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-warp-gold text-paper">
                <Shield size={24} />
              </span>
            </div>
            <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-warp-gold">
              Verification status
            </p>
            <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
              Verification unavailable
            </h1>
            <p className="mt-2 text-sm text-muted">
              Could not fetch verification for
              <span className="mx-1 font-mono">{serial}</span>
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
              {errorMessage}
            </p>
          </div>
          <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-paper p-6 text-center shadow-[var(--shadow)]">
            <p className="text-sm text-muted">
              The page is connected to API-first verification, but this request is
              being retried with degraded-mode handling. Re-check in a moment.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={`/verify/${serial}`}
                className="inline-flex items-center gap-2 rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper"
              >
                Retry verification
              </Link>
              <Link
                href="/marketplace"
                className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-medium text-indigo"
              >
                Browse marketplace
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const verificationPayload = payload!;
  const anchorHash = verificationPayload.anchorHash ?? "Not minted";
  const anchorChain = verificationPayload.anchorChain ?? "Not anchored";
  const anchorProvider =
    verificationPayload.anchorProvider ?? "database record only";
  const hasSepoliaAnchor = Boolean(verificationPayload.anchorExplorerUrl);
  const claimStatus = product.claimStatus ?? "self_declared";
  const passportValid = claimStatus !== "revoked";
  const claimVerified =
    claimStatus === "cooperative_verified" ||
    claimStatus === "gi_authority_verified";
  const statusText =
    claimStatus === "revoked"
      ? "This product record was revoked"
      : claimStatus === "gi_authority_verified"
        ? "GI authority verification recorded"
        : claimStatus === "cooperative_verified"
          ? "Cooperative verification recorded"
          : claimStatus === "evidence_submitted"
            ? "Evidence submitted for review"
            : "Seller-declared product record";
  const statusTone = claimVerified ? "text-loom" : claimStatus === "revoked" ? "text-lac" : "text-indigo";
  const statusNote = hasSepoliaAnchor
    ? "The digital record is anchored on Ethereum Sepolia. This proves record integrity, not physical authenticity."
    : "No blockchain anchor has been minted. Claims remain at the evidence status shown below.";

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
                {claimStatus.replaceAll("_", " ")}
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

            <div className="mt-6 rounded-2xl border border-[var(--line)] p-4">
              <p className="text-sm font-medium text-ink">Claim evidence</p>
              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Issuer</dt>
                  <dd className="font-medium text-ink">
                    {product.claimIssuer ?? "Seller declaration only"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Verification method</dt>
                  <dd className="font-medium text-ink">
                    {product.verificationMethod ?? "Not independently verified"}
                  </dd>
                </div>
              </dl>
              {product.evidenceUrl ? (
                <a
                  href={product.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo"
                >
                  Review submitted evidence
                  <ExternalLink size={12} />
                </a>
              ) : null}
              {product.originalAudioUrl ? (
                <audio
                  controls
                  src={product.originalAudioUrl}
                  className="mt-3 w-full"
                />
              ) : null}
            </div>

            <div className="mt-6 rounded-2xl border border-warp-gold/30 bg-warp-gold-soft p-4">
              <div className="flex items-start gap-3">
                <Fingerprint className="mt-0.5 shrink-0 text-warp-gold" size={18} />
                <div>
                  <p className="text-sm font-medium text-ink">
                    Anchored integrity hash
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-muted">
                    {anchorHash} · {anchorChain} · {anchorProvider}
                  </p>
                  {verificationPayload.anchorExplorerUrl ? (
                    <div className="mt-2 flex flex-wrap gap-3">
                      <a
                        href={verificationPayload.anchorExplorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo hover:underline"
                      >
                        Transaction
                        <ExternalLink size={12} />
                      </a>
                      {verificationPayload.anchorContractExplorerUrl ? (
                        <a
                          href={verificationPayload.anchorContractExplorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo hover:underline"
                        >
                          Smart contract
                          <ExternalLink size={12} />
                        </a>
                      ) : null}
                      {verificationPayload.anchorTokenExplorerUrl ? (
                        <a
                          href={verificationPayload.anchorTokenExplorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo hover:underline"
                        >
                          NFT token #{verificationPayload.anchorTokenId}
                          <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  {verificationPayload.anchorStatus === "confirmed" ? (
                    <p className="mt-2 text-xs text-loom">
                      Confirmed with {verificationPayload.anchorConfirmations} block
                      {verificationPayload.anchorConfirmations === 1 ? "" : "s"}.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <section className="mt-6 flex flex-col items-center rounded-2xl bg-mist p-5 text-center">
              <h3 className="font-display text-xl text-indigo">
                Scan this product record
              </h3>
              <p className="mb-4 mt-1 text-xs text-muted">
                Open this same public evidence page from another phone.
              </p>
              <VerificationQr serial={product.serial} />
            </section>

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
