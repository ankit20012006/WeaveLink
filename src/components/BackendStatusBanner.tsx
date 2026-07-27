import { ApiHealthBanner } from "@/components/ApiHealthBanner";

export function BackendStatusBanner() {
  return (
    <div className="border-b border-slate-200 bg-paper/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2 sm:px-6">
        <p className="text-center text-xs text-ink">
          <span className="font-medium">Backend status</span>
          <span className="text-muted">
            {" "}
            — API-first flow with resilience when connectivity is unstable.
          </span>
        </p>
        <ApiHealthBanner />
      </div>
    </div>
  );
}
