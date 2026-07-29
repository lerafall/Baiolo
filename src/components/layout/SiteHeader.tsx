"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ModeBadge } from "@/components/layout/ModeBadge";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/LocaleProvider";
import { authHref } from "@/lib/next-path";
import { useSession } from "@/lib/session";

export function SiteHeader({ showJoin = true }: { showJoin?: boolean }) {
  const pathname = usePathname();
  const t = useT();
  const { session, ready, signOut } = useSession();
  const signedIn = ready && Boolean(session.userId || session.email);
  const joinHref = authHref(pathname || "/explore");

  const links = [
    { href: "/explore", label: t("nav.explore") },
    { href: "/make", label: t("nav.make") },
    { href: "/create", label: t("nav.create") },
    { href: "/projects", label: t("nav.projects") },
    { href: "/favorites", label: t("nav.favorites") },
  ];

  async function handleSignOut() {
    await signOut();
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-[64px] w-full max-w-6xl items-center gap-2 px-3 sm:min-h-[72px] sm:gap-4 sm:px-5 md:gap-6 md:px-8">
        <Link
          href="/"
          className="shrink-0 text-xl font-extrabold tracking-tight text-brand-strong sm:text-2xl"
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
          <LanguageSwitcher />
          <NotificationBell />
          {showJoin &&
            (signedIn ? (
              <>
                <Button href="/profile" size="m" variant="secondary">
                  {session.avatar} {t("nav.profile")}
                </Button>
                <Button
                  type="button"
                  size="m"
                  variant="ghost"
                  onClick={() => void handleSignOut()}
                >
                  {t("nav.signOut")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  href={authHref(pathname || "/explore", { mode: "signin" })}
                  size="m"
                  variant="ghost"
                >
                  {t("nav.signIn")}
                </Button>
                <Button href={joinHref} size="m">
                  {t("nav.join")}
                </Button>
              </>
            ))}
        </nav>

        <div className="ml-auto flex max-w-[65%] shrink-0 items-center justify-end gap-1.5 sm:max-w-none sm:gap-2 md:hidden">
          <LanguageSwitcher className="shrink-0 scale-90 origin-right sm:scale-100" />
          {signedIn && <NotificationBell />}
          {showJoin &&
            (signedIn ? (
              <>
                <Button
                  href="/profile"
                  size="m"
                  variant="secondary"
                  className="min-h-10 shrink-0 px-3 text-sm"
                >
                  {t("nav.profile")}
                </Button>
                <Button
                  type="button"
                  size="m"
                  variant="ghost"
                  className="min-h-10 shrink-0 px-2.5 text-sm"
                  onClick={() => void handleSignOut()}
                >
                  {t("nav.out")}
                </Button>
              </>
            ) : (
              <Button
                href={joinHref}
                size="m"
                className="min-h-10 shrink-0 px-3.5 text-sm"
              >
                {t("nav.join")}
              </Button>
            ))}
        </div>
      </div>
    </header>
  );
}
