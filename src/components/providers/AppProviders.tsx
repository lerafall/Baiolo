"use client";

import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/components/ui/Toast";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/config";

export function AppProviders({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return (
    <LocaleProvider initialLocale={locale}>
      <SessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </LocaleProvider>
  );
}
