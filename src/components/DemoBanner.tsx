export function DemoBanner() {
  return (
    <div className="border-b border-warp-gold/30 bg-warp-gold-soft">
      <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs text-ink sm:px-6">
        <span className="font-medium">Showcase demo</span>
        <span className="text-muted">
          {" "}
          — UI only. Catalog, authenticity, and orders use mocked data. Backend
          & DB come after selection.
        </span>
      </p>
    </div>
  );
}
