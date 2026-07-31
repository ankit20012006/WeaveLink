import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xl text-indigo">WeaveLink</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Multilingual assisted commerce for handloom — portable catalogs,
            creator attribution, real capacity, and transparent value.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted">
          <Link href="/marketplace" className="hover:text-indigo">
            Marketplace
          </Link>
          <Link href="/b2b" className="hover:text-indigo">
            B2B
          </Link>
          <Link href="/sell" className="hover:text-indigo">
            For weavers
          </Link>
          <Link href="/verify/WL-KAN-2026-08421" className="hover:text-indigo">
            Verify
          </Link>
          <Link href="/resources" className="hover:text-indigo">
            Learn
          </Link>
        </div>
      </div>
      <div className="border-t border-[var(--line)]">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted sm:px-6">
          WeaveLink for Handloom Hackathon 2026 · Market Access &
          Digital Integration · API-first with resilient fallback support
        </p>
      </div>
    </footer>
  );
}
