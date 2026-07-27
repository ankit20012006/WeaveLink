import { ApiHealthBanner } from "@/components/ApiHealthBanner";

export function DemoBanner() {
  return (
    <div className="border-b border-warp-gold/30 bg-warp-gold-soft">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2 sm:px-6">
        <p className="text-center text-xs text-ink">
          <span className="font-medium">Showcase mode</span>
          <span className="text-muted">
            {" "}
            — API-first flow with automatic local fallback when backend is
            unavailable.
          </span>
        </p>
        <ApiHealthBanner />
      </div>
    </div>
  );
}
