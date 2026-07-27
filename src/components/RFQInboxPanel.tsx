"use client";

import { useState } from "react";
import { CheckCircle, XCircle, type LucideIcon } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { updateRFQStatus, type RFQRecord } from "@/lib/weavelink-api";

const rfqStatusStyles = {
  submitted: "bg-indigo-soft text-indigo-mid",
  accepted: "bg-loom-soft text-loom",
  rejected: "bg-cotton text-muted",
} as const;

export function RFQInboxPanel({ initialRfqs }: { initialRfqs: RFQRecord[] }) {
  const [rfqs, setRfqs] = useState<RFQRecord[]>(initialRfqs);
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const markStatus = async (rfqId: string, status: RFQRecord["status"]) => {
    setBusyById((current) => ({ ...current, [rfqId]: true }));
    setErrorById((current) => ({ ...current, [rfqId]: "" }));

    try {
      const updated = await updateRFQStatus(rfqId, status);
      setRfqs((current) =>
        current.map((rfq) => (rfq.id === rfqId ? updated : rfq)),
      );
      return;
    } catch {
      setRfqs((current) =>
        current.map((rfq) =>
          rfq.id === rfqId ? { ...rfq, status } : rfq,
        ),
      );
      setErrorById((current) => ({
        ...current,
        [rfqId]:
          "Backend unavailable. Status updated locally for this demo session.",
      }));
    } finally {
      setBusyById((current) => ({ ...current, [rfqId]: false }));
    }
  };

  return (
    <ul className="mt-4 space-y-3">
      {rfqs.length === 0 ? (
        <li className="rounded-2xl border border-[var(--line)] bg-paper p-4 text-sm text-muted">
          No RFQs yet. Requesters will appear here when boutiques and
          institutions submit bulk requests.
        </li>
      ) : (
        rfqs.map((rfq) => (
          <li key={rfq.id} className="rounded-2xl border border-[var(--line)] bg-paper p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{rfq.productTitle}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {rfq.buyer} · Qty {rfq.quantity}
                </p>
                <p className="mt-1 text-sm font-medium text-indigo">
                  {formatINR(rfq.estimatedTotal)}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${rfqStatusStyles[rfq.status]}`}
              >
                {rfq.status}
              </span>
            </div>

            {rfq.notes ? (
              <p className="mt-2 text-xs text-muted">{rfq.notes}</p>
            ) : null}

            <p className="mt-1 text-xs text-muted">{rfq.createdAt}</p>

            {errorById[rfq.id] ? (
              <p className="mt-2 rounded-xl bg-amber-50 px-2 py-1 text-xs text-amber-900">
                {errorById[rfq.id]}
              </p>
            ) : null}

            {rfq.status === "submitted" ? (
              <div className="mt-3 flex items-center gap-2">
                <ActionButton
                  icon={CheckCircle}
                  label="Accept"
                  onClick={() => markStatus(rfq.id, "accepted")}
                  disabled={busyById[rfq.id]}
                />
                <ActionButton
                  icon={XCircle}
                  label="Reject"
                  onClick={() => markStatus(rfq.id, "rejected")}
                  disabled={busyById[rfq.id]}
                />
              </div>
            ) : null}
          </li>
        ))
      )}
    </ul>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-paper ${
        disabled ? "cursor-not-allowed bg-indigo/65" : "bg-indigo"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
