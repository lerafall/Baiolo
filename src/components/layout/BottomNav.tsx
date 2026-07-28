"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  { href: "/explore", label: "Explore", icon: "◎" },
  { href: "/create", label: "Create", icon: "+" },
  { href: "/projects", label: "Projects", icon: "▦" },
  { href: "/profile", label: "Profile", icon: "☺" },
];

export function BottomNav() {
  const pathname = usePathname();

  // Create wizard owns the thumb zone with its sticky CTA.
  if (pathname.startsWith("/create")) return null;

  return (
    <nav
      aria-label="Mobile"
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
