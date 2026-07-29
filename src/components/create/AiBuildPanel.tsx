"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DictationField } from "@/components/ui/DictationField";
import { HtmlWorkshop } from "@/components/create/HtmlWorkshop";
import { authHref } from "@/lib/next-path";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { StarterFiles } from "@/lib/html-starters";
import type { ProjectCategory } from "@/lib/types";

type ClarifyQuestion = { id: string; question: string };

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
  const [phase, setPhase] = useState<"idle" | "clarify" | "build">("idle");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [questions, setQuestions] = useState<ClarifyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    setQuestions([]);
    setAnswers({});
    setError("");
  }, [prompt]);

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

  async function callBuild(options: {
    skipClarify?: boolean;
    withAnswers?: boolean;
  }) {
    setError("");
    const trimmed = prompt.trim();
    if (trimmed.length < 12) {
      setError(t("workshop.aiPromptShort"));
      return;
    }

    const answerPayload = options.withAnswers
      ? questions
          .map((q) => ({
            id: q.id,
            question: q.question,
            answer: (answers[q.id] || "").trim(),
          }))
          .filter((a) => a.answer)
      : [];

    if (options.withAnswers && answerPayload.length === 0) {
      setError(t("workshop.aiAnswerNeeded"));
      return;
    }

    setBusy(true);
    setPhase(options.skipClarify || options.withAnswers ? "build" : "clarify");
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          userId,
          email,
          skipClarify: options.skipClarify || false,
          answers: options.withAnswers ? answerPayload : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        status?: string;
        questions?: ClarifyQuestion[];
        title?: string;
        description?: string;
        category?: ProjectCategory;
        files?: StarterFiles;
      };

      if (!res.ok) {
        setError(data.error || t("workshop.aiFailed"));
        return;
      }

      if (data.status === "clarify" && data.questions?.length) {
        setQuestions(data.questions);
        setAnswers({});
        return;
      }

      if (!data.files?.["index.html"]) {
        setError(data.error || t("workshop.aiFailed"));
        return;
      }

      setQuestions([]);
      setAnswers({});
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
      setPhase("idle");
    }
  }

  const busyLabel =
    phase === "clarify"
      ? t("workshop.aiChecking")
      : phase === "build"
        ? t("workshop.aiBuilding")
        : t("workshop.aiBuilding");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-lg font-bold">{t("workshop.aiTitle")}</p>
        <p className="mt-1 text-ink-muted">{t("workshop.aiPromptSub")}</p>
        <label className="mt-4 block">
          <span className="sr-only">{t("workshop.aiPromptLabel")}</span>
          <DictationField value={prompt} onChange={onPromptChange}>
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
            onClick={() => void callBuild({})}
          >
            {busy
              ? busyLabel
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

      {questions.length > 0 && (
        <div className="rounded-xl border-2 border-brand/25 bg-lilac/30 p-5">
          <p className="text-lg font-extrabold">{t("workshop.aiClarifyTitle")}</p>
          <p className="mt-1 text-ink-muted">{t("workshop.aiClarifySub")}</p>
          <div className="mt-4 space-y-4">
            {questions.map((q) => (
              <label key={q.id} className="block">
                <span className="font-bold">{q.question}</span>
                <DictationField
                  className="mt-2"
                  value={answers[q.id] || ""}
                  onChange={(value) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: value }))
                  }
                >
                  <input
                    value={answers[q.id] || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                    disabled={busy}
                    placeholder={t("workshop.aiClarifyPlaceholder")}
                    className="min-h-12 w-full rounded-pill border-2 border-border bg-surface px-5 focus:border-brand focus:outline-none disabled:opacity-60"
                  />
                </DictationField>
              </label>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              size="l"
              disabled={busy}
              onClick={() => void callBuild({ withAnswers: true })}
            >
              {busy && phase === "build"
                ? t("workshop.aiBuilding")
                : t("workshop.aiBuildWithAnswers")}
            </Button>
            <Button
              type="button"
              size="l"
              variant="secondary"
              disabled={busy}
              onClick={() => void callBuild({ skipClarify: true })}
            >
              {t("workshop.aiSkipClarify")}
            </Button>
          </div>
        </div>
      )}

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
