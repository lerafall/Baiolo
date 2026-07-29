export const LOCALES = ["en", "pl"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "baiolo_locale";

export const localeLabels: Record<Locale, string> = {
  en: "EN",
  pl: "PL",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "pl";
}

/** Prefer Polish when Accept-Language leads with pl; otherwise English. */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const primary = header.split(",")[0]?.trim().toLowerCase() ?? "";
  if (primary.startsWith("pl")) return "pl";
  return DEFAULT_LOCALE;
}
