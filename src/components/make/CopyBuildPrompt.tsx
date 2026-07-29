"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BAIOLO_BUILD_PROMPT } from "@/lib/build-prompt";
import { useT } from "@/lib/i18n/LocaleProvider";

export function CopyBuildPrompt() {
  const t = useT();
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
          {t("make.readyToPaste")}
        </p>
        <Button type="button" size="m" onClick={copy}>
          {copied ? t("make.copied") : t("make.copyPrompt")}
        </Button>
      </div>
      <p className="mt-3 text-ink-muted">{t("make.swapHint")}</p>
      <button
        type="button"
        className="mt-4 text-sm font-bold text-brand-strong underline"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? t("make.hidePrompt") : t("make.peekPrompt")}
      </button>
      {open && (
        <pre className="mt-3 max-h-[22rem] overflow-auto whitespace-pre-wrap rounded-lg bg-ink px-4 py-4 text-left text-sm leading-relaxed text-on-brand">
          {BAIOLO_BUILD_PROMPT}
        </pre>
      )}
    </div>
  );
}
