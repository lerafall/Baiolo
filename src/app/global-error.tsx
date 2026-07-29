"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { getMessages, translate } from "@/lib/i18n/translate";

function localeFromCookie(): Locale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
  );
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isLocale(value) ? value : "en";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    setLocale(localeFromCookie());
  }, []);

  const messages = getMessages(locale);
  const title = translate(messages, "errors.title");
  const body = translate(messages, "errors.body");
  const tryAgain = translate(messages, "errors.tryAgain");

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-[#fff8ef] font-sans text-[#1e1b4b]">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mt-3 text-lg text-[#5b53a0]">{body}</p>
          <Button className="mt-8" size="l" onClick={reset}>
            {tryAgain}
          </Button>
          {error.digest && (
            <p className="mt-4 text-xs text-[#7c75a8]">Ref: {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
