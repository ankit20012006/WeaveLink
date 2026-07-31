"use client";

import { Languages } from "lucide-react";
import {
  supportedLocales,
  useLanguage,
  type Locale,
} from "@/lib/language";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <label className="relative inline-flex items-center">
      <Languages
        size={15}
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 text-muted"
      />
      <span className="sr-only">{t("language.label")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={t("language.label")}
        className="h-9 appearance-none rounded-full border border-[var(--line)] bg-paper py-1 pl-8 pr-3 text-xs font-medium text-indigo"
      >
        {supportedLocales.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
