"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BAIOLO_BUILD_PROMPT } from "@/lib/build-prompt";

export function CopyBuildPrompt() {
  const [copied, setCopied] = useState(false);

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
          Prompt for your AI chat
        </p>
        <Button type="button" size="m" onClick={copy}>
          {copied ? "Copied!" : "Copy prompt"}
        </Button>
      </div>
      <pre className="mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg bg-ink px-4 py-4 text-left text-sm leading-relaxed text-on-brand">
        {BAIOLO_BUILD_PROMPT}
      </pre>
      <p className="mt-3 text-sm text-ink-muted">
        Paste into ChatGPT, Claude, Cursor, etc. Replace the last line with your
        idea.
      </p>
    </div>
  );
}
