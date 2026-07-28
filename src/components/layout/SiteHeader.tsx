"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ModeBadge } from "@/components/layout/ModeBadge";
import { cn } from "@/lib/cn";
import { authHref } from "@/lib/next-path";
import { useSession } from "@/lib/session";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/create", label: "Create" },
  { href: "/projects", label: "My Projects" },
  { href: "/favorites", label: "Favorites" },
];

export function SiteHeader({ showJoin = true }: { showJoin?: boolean }) {
  const pathname = usePathname();
  const { session, ready } = useSession();
  const signedIn = ready && Boolean(session.email);
  const joinHref = authHref(pathname || "/explore");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-[72px] w-full max-w-6xl items-center gap-6 px-5 md:px-8">
        <Link
          href="/"
          className="shrink-0 text-2xl font-extrabold tracking-tight text-brand-strong"
        >
          Baiolo
        </Link>
        <ModeBadge />

        <nav
          aria-label="Primary"
          className="ml-auto hidden items-center gap-7 md:flex"
        >
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-base font-bold transition-colors",
                  active ? "text-brand-strong" : "text-ink-muted hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <NotificationBell />
          {showJoin &&
            (signedIn ? (
              <Button href="/profile" size="m" variant="secondary">
                {session.avatar} Profile
              </Button>
            ) : (
              <Button href={joinHref} size="m">
                Join
              </Button>
            ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <NotificationBell />
          {showJoin &&
            (signedIn ? (
              <Button href="/profile" size="m" variant="secondary">
                Profile
              </Button>
            ) : (
              <Button href={joinHref} size="m">
                Join
              </Button>
            ))}
        </div>
      </div>
    </header>
  );
}
