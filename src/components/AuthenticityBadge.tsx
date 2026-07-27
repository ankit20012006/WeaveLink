import { BadgeCheck, CircleDashed, CircleX, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthenticityBadge({
  compact = false,
  status = "authenticated",
  className,
}: {
  compact?: boolean;
  status?: "authenticated" | "revoked" | "pending";
  className?: string;
}) {
  if (status === "pending") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-indigo/20 bg-indigo-soft px-2 py-0.5 text-[11px] font-medium text-indigo-mid",
          className,
        )}
      >
        <CircleDashed size={12} />
        Passport pending
      </span>
    );
  }

  if (status === "revoked") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900",
          className,
        )}
      >
        <CircleX size={12} />
        Passport revoked
      </span>
    );
  }

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-loom-soft px-2 py-0.5 text-[11px] font-medium text-loom",
          className,
        )}
      >
        <BadgeCheck size={12} />
        Authenticated
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-loom/20 bg-loom-soft px-3 py-1.5 text-sm font-medium text-loom",
        className,
      )}
    >
      <Shield size={15} />
      Digital Product Passport
    </div>
  );
}
