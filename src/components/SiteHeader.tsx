"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage, type MessageKey } from "@/lib/language";
import { cn } from "@/lib/utils";

const links = [
  { href: "/marketplace", label: "nav.marketplace" },
  { href: "/b2b", label: "nav.b2b" },
  { href: "/sell", label: "nav.list" },
  { href: "/dashboard", label: "nav.seller" },
  { href: "/verify/WL-KAN-2026-08421", label: "nav.verify" },
  { href: "/resources", label: "nav.learn" },
] satisfies { href: string; label: MessageKey }[];

function isActive(pathname: string, href: string) {
  if (href.startsWith("/verify")) return pathname.startsWith("/verify");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--mist)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold tracking-tight text-indigo">
            WeaveLink
          </span>
          <span className="hidden text-[11px] uppercase tracking-[0.18em] text-muted sm:inline">
            Authenticated handloom
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-indigo",
                isActive(pathname, link.href) && "bg-indigo-soft text-indigo",
              )}
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/sell"
            className="hidden rounded-full bg-indigo px-4 py-2 text-sm font-medium text-paper transition hover:bg-indigo-mid sm:inline-flex"
          >
            {t("nav.startListing")}
          </Link>
          <button
            type="button"
            className="inline-flex rounded-full border border-[var(--line)] p-2 text-indigo md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--line)] bg-paper px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-cotton"
              >
                {t(link.label)}
              </Link>
            ))}
            <Link
              href="/sell"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-indigo px-4 py-2.5 text-center text-sm font-medium text-paper"
            >
              {t("nav.startListing")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
