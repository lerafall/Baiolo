import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { BottomNav } from "@/components/layout/BottomNav";
import { InstallHint } from "@/components/layout/InstallHint";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full bg-canvas font-sans text-ink">
        <AppProviders>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-brand focus:px-4 focus:py-2 focus:font-bold focus:text-on-brand"
          >
            Skip to content
          </a>
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
