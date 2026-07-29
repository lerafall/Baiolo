import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Nunito } from "next/font/google";
import { BottomNav } from "@/components/layout/BottomNav";
import { InstallHint } from "@/components/layout/InstallHint";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SkipToContent } from "@/components/i18n/SkipToContent";
import { AppProviders } from "@/components/providers/AppProviders";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/config";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Baiolo",
    template: "%s · Baiolo",
  },
  description:
    "Baiolo is a playful place to share prototypes, test ideas, and find what people love.",
  applicationName: "Baiolo",
  manifest: "/manifest.webmanifest",
};

async function readLocale(): Promise<Locale> {
  const jar = await cookies();
  const value = jar.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await readLocale();

  return (
    <html lang={locale} className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full bg-canvas font-sans text-ink">
        <AppProviders locale={locale}>
          <SkipToContent />
          <div
            id="main"
            className="flex min-h-full flex-col pb-20 md:pb-0"
            tabIndex={-1}
          >
            {children}
            <SiteFooter />
          </div>
          <BottomNav />
          <InstallHint />
        </AppProviders>
      </body>
    </html>
  );
}
