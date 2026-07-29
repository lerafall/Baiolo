"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DictationField } from "@/components/ui/DictationField";
import { HtmlWorkshop } from "@/components/create/HtmlWorkshop";
import { authHref } from "@/lib/next-path";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { StarterFiles } from "@/lib/html-starters";
import type { ProjectCategory } from "@/lib/types";

type AiBuildPanelProps = {
  signedIn: boolean;
  userId: string | null;
  email: string | null;
  prompt: string;
  files: StarterFiles | undefined;
  onPromptChange: (prompt: string) => void;
  onBuilt: (data: {
    files: StarterFiles;
    title: string;
    description: string;
    category: ProjectCategory;
  }) => void;
  onFilesChange: (files: StarterFiles) => void;
};

export function AiBuildPanel({
  signedIn,
  userId,
  email,
  prompt,
  files,
  onPromptChange,
  onBuilt,
  onFilesChange,
}: AiBuildPanelProps) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  if (!signedIn) {
    return (
      <div className="rounded-xl border-2 border-brand/30 bg-lilac/40 p-6 text-center">
        <p className="text-xl font-extrabold">{t("workshop.aiTitle")}</p>
        <p className="mt-2 text-ink-muted">{t("workshop.aiNeedAccount")}</p>
        <Button href={authHref("/create", { mode: "join" })} className="mt-5" size="l">
          {t("workshop.aiJoin")}
        </Button>
      </div>
    );
  }

  async function generate() {
    setError("");
    const trimmed = prompt.trim();
    if (trimmed.length < 12) {
      setError(t("workshop.aiPromptShort"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          userId,
          email,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        title?: string;
        description?: string;
        category?: ProjectCategory;
        files?: StarterFiles;
      };
      if (!res.ok || !data.files?.["index.html"]) {
        setError(data.error || t("workshop.aiFailed"));
        return;
      }
      onBuilt({
        files: data.files,
        title: data.title || "AI project",
        description: data.description || trimmed.slice(0, 160),
        category: data.category || "experiment",
      });
      setRevision((n) => n + 1);
    } catch {
      setError(t("workshop.aiFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-lg font-bold">{t("workshop.aiTitle")}</p>
        <p className="mt-1 text-ink-muted">{t("workshop.aiPromptSub")}</p>
        <label className="mt-4 block">
          <span className="sr-only">{t("workshop.aiPromptLabel")}</span>
          <DictationField
            value={prompt}
            onChange={onPromptChange}
          >
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              rows={4}
              maxLength={2000}
              disabled={busy}
              placeholder={t("workshop.aiPromptPlaceholder")}
              className="w-full rounded-xl border-2 border-border p-4 text-lg focus:border-brand focus:outline-none disabled:opacity-60"
            />
          </DictationField>
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="l"
            disabled={busy}
            onClick={() => void generate()}
          >
            {busy
              ? t("workshop.aiBuilding")
              : files
                ? t("workshop.aiRebuild")
                : t("workshop.aiBuild")}
          </Button>
          <p className="text-sm text-ink-muted">{t("workshop.aiHintPaid")}</p>
        </div>
        {error && (
          <p className="mt-3 font-semibold text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      {files && (
        <HtmlWorkshop
          key={revision}
          files={files}
          onFilesChange={onFilesChange}
          showStarterPicker={false}
        />
      )}
    </div>
  );
}
