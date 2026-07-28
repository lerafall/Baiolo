"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fff8ef] font-sans text-[#1e1b4b]">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
          <h1 className="text-3xl font-extrabold">Something went wobbly</h1>
          <p className="mt-3 text-lg text-[#5b53a0]">
            We couldn’t open that page right now. Try again in a moment.
          </p>
          <Button className="mt-8" size="l" onClick={reset}>
            Try again
          </Button>
          {error.digest && (
            <p className="mt-4 text-xs text-[#7c75a8]">Ref: {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
