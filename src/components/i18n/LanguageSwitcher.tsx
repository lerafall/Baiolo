"use client";

import { localeLabels, LOCALES } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/cn";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-pill border-2 border-border bg-surface p-0.5",
        className,
      )}
      role="group"
      aria-label={t("lang.label")}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          title={code === "en" ? t("lang.en") : t("lang.pl")}
          onClick={() => setLocale(code)}
          className={cn(
            "min-h-8 rounded-pill px-2.5 text-xs font-extrabold transition-colors",
            locale === code
              ? "bg-brand text-on-brand"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {localeLabels[code]}
        </button>
      ))}
    </div>
  );
}
