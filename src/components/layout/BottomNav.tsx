"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/LocaleProvider";

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();

  const items = [
    { href: "/explore", label: t("nav.explore"), icon: "◎" },
    { href: "/create", label: t("nav.create"), icon: "+" },
    { href: "/projects", label: t("nav.projectsShort"), icon: "▦" },
    { href: "/profile", label: t("nav.profile"), icon: "☺" },
  ];

  // Create wizard owns the thumb zone with its sticky CTA.
  if (pathname.startsWith("/create")) return null;

  return (
    <nav
      aria-label={t("nav.mobile")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[var(--shadow-2)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-bold transition-colors",
                  active
                    ? "bg-lilac text-brand-strong"
                    : "text-ink-muted hover:bg-lilac/40 hover:text-ink",
                )}
              >
                <span aria-hidden className="text-lg leading-none">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
