import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { en, type Messages } from "@/lib/i18n/messages/en";
import { pl } from "@/lib/i18n/messages/pl";

const catalogs: Record<Locale, Messages> = { en, pl };

export type MessageKey = string;

type LeafPaths<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : {
      [K in keyof T & string]: LeafPaths<
        T[K],
        Prefix extends "" ? K : `${Prefix}.${K}`
      >;
    }[keyof T & string];

export type TranslationKey = LeafPaths<Messages>;

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
}

export function translate(
  messages: Messages,
  key: TranslationKey | string,
  vars?: Record<string, string | number>,
): string {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const part of parts) {
    if (cur && typeof cur === "object" && part in (cur as object)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  if (typeof cur !== "string") return key;
  if (!vars) return cur;
  return cur.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}
