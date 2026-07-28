import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <h1 className="text-4xl font-extrabold">We couldn&apos;t find that</h1>
      <p className="mt-3 text-lg text-ink-muted">
        That project might have moved, or the link is a little off.
      </p>
      <Button href="/explore" className="mt-8" size="l">
        Back to Explore
      </Button>
      <Link href="/" className="mt-4 font-bold text-brand-strong underline">
        Go home
      </Link>
    </main>
  );
}
