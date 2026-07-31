"use client";

import { ClipboardCheck, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getMe,
  verifyProductClaim,
  type Product,
} from "@/lib/weavelink-api";

export function ClaimReviewPanel({
  productId,
  initialProduct,
}: {
  productId: string;
  initialProduct: Product;
}) {
  const [canReview, setCanReview] = useState(false);
  const [product, setProduct] = useState(initialProduct);
  const [status, setStatus] = useState<
    "evidence_submitted" | "cooperative_verified" | "gi_authority_verified" | "revoked"
  >("cooperative_verified");
  const [issuer, setIssuer] = useState("");
  const [method, setMethod] = useState("Physical product and submitted media review");
  const [evidenceUrl, setEvidenceUrl] = useState(initialProduct.evidenceUrl ?? "");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    void getMe().then((me) => {
      setCanReview(
        Boolean(
          me?.roles.some((role) =>
            ["admin", "cooperative", "gi_authority"].includes(role),
          ),
        ),
      );
    });
  }, []);

  if (!canReview) return null;

  const submit = async () => {
    setWorking(true);
    setMessage("");
    try {
      const updated = await verifyProductClaim(productId, {
        status,
        issuer,
        issuerRole: status === "gi_authority_verified" ? "GI authority" : "Cooperative reviewer",
        evidenceUrl,
        verificationMethod: method,
      });
      setProduct(updated);
      setMessage(`Claim updated to ${updated.claimStatus?.replaceAll("_", " ")}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review update failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-indigo/20 bg-indigo-soft/40 p-5">
      <div className="flex items-center gap-2 text-indigo">
        <ClipboardCheck size={18} />
        <h2 className="font-display text-xl">Independent claim review</h2>
      </div>
      <p className="mt-2 text-xs text-muted">
        Current status: {product.claimStatus?.replaceAll("_", " ") ?? "self declared"}.
        This action records the named issuer and evidence; it is separate from NFT minting.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          className="rounded-xl border border-[var(--line)] bg-paper px-3 py-2.5 text-sm"
        >
          <option value="evidence_submitted">Evidence submitted</option>
          <option value="cooperative_verified">Cooperative verified</option>
          <option value="gi_authority_verified">GI authority verified</option>
          <option value="revoked">Revoke claim</option>
        </select>
        <input
          value={issuer}
          onChange={(event) => setIssuer(event.target.value)}
          placeholder="Named cooperative or authority"
          className="rounded-xl border border-[var(--line)] bg-paper px-3 py-2.5 text-sm"
        />
        <input
          value={evidenceUrl}
          onChange={(event) => setEvidenceUrl(event.target.value)}
          placeholder="Evidence URL"
          className="rounded-xl border border-[var(--line)] bg-paper px-3 py-2.5 text-sm"
        />
        <input
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          placeholder="Verification method"
          className="rounded-xl border border-[var(--line)] bg-paper px-3 py-2.5 text-sm"
        />
      </div>
      <button
        type="button"
        disabled={working || !issuer.trim() || !evidenceUrl.trim() || !method.trim()}
        onClick={() => void submit()}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
      >
        {working ? <LoaderCircle className="animate-spin" size={15} /> : null}
        Record review decision
      </button>
      {message ? <p className="mt-3 text-xs text-muted">{message}</p> : null}
    </section>
  );
}
