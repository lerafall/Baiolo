"use client";

import { Button } from "@/components/ui/Button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <h1 className="text-3xl font-extrabold">That didn’t work</h1>
      <p className="mt-3 text-lg text-ink-muted">
        Something went wrong on this page. You can try again.
      </p>
      <Button className="mt-8" size="l" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
