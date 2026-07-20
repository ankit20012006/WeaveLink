import { BadgeCheck, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthenticityBadge({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
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
