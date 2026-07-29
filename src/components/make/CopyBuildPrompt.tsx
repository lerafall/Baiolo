"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BAIOLO_BUILD_PROMPT } from "@/lib/build-prompt";

export function CopyBuildPrompt() {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(BAIOLO_BUILD_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-border bg-canvas p-4 shadow-[var(--shadow-1)] md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
          Ready to paste
        </p>
        <Button type="button" size="m" onClick={copy}>
          {copied ? "Copied!" : "Copy prompt"}
        </Button>
      </div>
      <p className="mt-3 text-ink-muted">
        At the end you’ll see{" "}
        <code className="rounded bg-lilac/50 px-1.5 py-0.5 font-bold text-ink">
          [your idea here]
        </code>
        — swap that for your idea, then send.
      </p>
      <button
        type="button"
        className="mt-4 text-sm font-bold text-brand-strong underline"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide prompt" : "Peek at the prompt"}
      </button>
      {open && (
        <pre className="mt-3 max-h-[22rem] overflow-auto whitespace-pre-wrap rounded-lg bg-ink px-4 py-4 text-left text-sm leading-relaxed text-on-brand">
          {BAIOLO_BUILD_PROMPT}
        </pre>
      )}
    </div>
  );
}
