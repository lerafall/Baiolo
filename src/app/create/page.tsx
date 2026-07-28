"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { FilterPill } from "@/components/ui/FilterPill";
import { cn } from "@/lib/cn";
import {
  buildPackageFromFile,
  buildPackageFromLabel,
  clearDraft,
  emptyDraft,
  readDraft,
  THUMB_OPTIONS,
  writeDraft,
  type CreateDraft,
} from "@/lib/draft";
import type { ProjectSubmission, UploadType } from "@/lib/moderation";
import { useSession } from "@/lib/session";
import { useSubmissions } from "@/lib/submissions";
import type { ProjectCategory } from "@/lib/types";
import {
  defaultTagsForCategory,
  normalizeTag,
  suggestedTags,
} from "@/lib/data/projects";
import { thumbBackgroundStyle } from "@/lib/thumb-style";

const steps = [
  "Choose type",
  "Add content",
  "Title & description",
  "Category & tags",
  "Thumbnail",
  "Review",
  "Submit",
] as const;

const uploadOptions: Array<{
  id: UploadType;
  title: string;
  body: string;
}> = [
  {
    id: "zip",
    title: "Upload ZIP",
    body: "Got a project folder zipped up? Drop it here.",
  },
  {
    id: "link",
    title: "Paste link",
    body: "Share a link to your live demo or prototype.",
  },
  {
    id: "template",
    title: "Use simple starter template",
    body: "Start from a friendly Baiolo starter pack.",
  },
];

const categories: Array<{ id: ProjectCategory; label: string }> = [
  { id: "game", label: "Game" },
  { id: "tool", label: "Tool" },
  { id: "experiment", label: "Experiment" },
  { id: "demo", label: "Demo" },
];

const templates = [
  {
    id: "Starter · Game",
    label: "Game starter",
    body: "A tiny playable loop to remix.",
  },
  {
    id: "Starter · Tool",
    label: "Tool starter",
    body: "A simple utility shell.",
  },
  {
    id: "Starter · Experiment",
    label: "Experiment",
    body: "A blank playful canvas.",
  },
] as const;

function CreateWizard() {
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get("edit");
  const { upsert, items, ready: submissionsReady } = useSubmissions();
  const { session, ready: sessionReady } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const zipFileRef = useRef<File | null>(null);
  const hydratedOnce = useRef(false);

  const [draft, setDraft] = useState<CreateDraft>(emptyDraft);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!submissionsReady || hydratedOnce.current) return;
    hydratedOnce.current = true;

    if (editId) {
      const sub = items.find((s) => s.id === editId);
      if (sub) {
        const loaded: CreateDraft = {
          id: sub.id,
          step: sub.status === "needs_changes" ? 5 : 0,
          uploadType: sub.uploadType,
          sourceLabel: sub.sourceLabel,
          packageReady: true,
          title: sub.title,
          description: sub.description,
          category: sub.category,
          tags:
            sub.tags?.length > 0
              ? sub.tags
              : sub.category
                ? defaultTagsForCategory[sub.category]
                : [],
          thumb: sub.thumbnail || THUMB_OPTIONS[0],
          hints:
            sub.status === "needs_changes" && sub.changeRequest
              ? [sub.changeRequest]
              : [],
        };
        setDraft(loaded);
        writeDraft(loaded);
        setHydrated(true);
        return;
      }
    }

    setDraft(readDraft() ?? emptyDraft());
    setHydrated(true);
  }, [editId, items, submissionsReady]);

  // Persist draft locally + mirror to My Projects (debounced — avoids render loops).
  useEffect(() => {
    if (!hydrated) return;

    writeDraft(draft);

    const flashTimer = window.setTimeout(() => {
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 900);
    }, 400);

    const upsertTimer = window.setTimeout(() => {
      if (!(draft.title.trim() || draft.sourceLabel.trim() || draft.uploadType)) {
        return;
      }
      upsert({
        id: draft.id,
        uploadType: draft.uploadType,
        sourceLabel: draft.sourceLabel,
        title: draft.title.trim() || "Untitled draft",
        description: draft.description,
        category: draft.category,
        tags: draft.tags,
        thumbnail: draft.thumb,
        status: "draft",
        risk: null,
        aiFlags: [],
        changeRequest: null,
        updatedAt: new Date().toISOString(),
        plays: 0,
        reactions: 0,
      });
    }, 500);

    return () => {
      window.clearTimeout(flashTimer);
      window.clearTimeout(upsertTimer);
    };
  }, [draft, hydrated, upsert]);

  const progress = useMemo(
    () => ((draft.step + 1) / steps.length) * 100,
    [draft.step],
  );

  function patch(partial: Partial<CreateDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function toggleTag(tag: string) {
    const next = normalizeTag(tag);
    if (!next) return;
    setDraft((d) => {
      if (d.tags.includes(next)) {
        return { ...d, tags: d.tags.filter((t) => t !== next) };
      }
      if (d.tags.length >= 5) return d;
      return { ...d, tags: [...d.tags, next] };
    });
  }

  function addCustomTag() {
    const next = normalizeTag(tagInput);
    if (!next) return;
    toggleTag(next);
    setTagInput("");
  }

  function pickCategory(id: ProjectCategory) {
    setDraft((d) => {
      const seeded =
        d.tags.length === 0 ? defaultTagsForCategory[id] : d.tags;
      return { ...d, category: id, tags: seeded.slice(0, 5) };
    });
  }

  function applyFile(file: File) {
    zipFileRef.current = file;
    const result = buildPackageFromFile(file);
    setDraft((d) => ({
      ...d,
      sourceLabel: result.sourceLabel,
      packageReady: result.packageReady,
      fileSizeLabel: result.fileSizeLabel,
      hints: result.hints,
      title: d.title || result.suggestedTitle,
    }));
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function runPackagingHelper() {
    const result = buildPackageFromLabel(draft.sourceLabel);
    if (!result.packageReady) {
      setError(result.hints[0] || "Add a file first.");
      return;
    }
    setError("");
    patch({
      sourceLabel: result.sourceLabel,
      packageReady: true,
      hints: result.hints,
    });
  }

  function tryAutoPackage(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    const result = buildPackageFromLabel(trimmed);
    if (!result.packageReady) return;
    setError("");
    patch({
      sourceLabel: result.sourceLabel,
      packageReady: true,
      hints: result.hints,
    });
  }

  const primaryLabel =
    draft.step === steps.length - 1
      ? submitting
        ? "Submitting…"
        : "Submit for checking"
      : "Continue";

  function renderActions(sticky = false) {
    return (
      <div
        className={cn(
          "flex flex-wrap gap-3",
          sticky && "w-full justify-stretch sm:justify-start",
        )}
      >
        {draft.step > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={back}
            disabled={submitting}
            className={sticky ? "flex-1 sm:flex-none" : undefined}
          >
            Back
          </Button>
        )}
        <Button
          type="button"
          size="l"
          onClick={next}
          disabled={submitting}
          className={sticky ? "flex-[2] sm:flex-none" : undefined}
        >
          {primaryLabel}
        </Button>
      </div>
    );
  }

  function next() {
    setError("");
    const {
      step,
      uploadType,
      sourceLabel,
      packageReady,
      title,
      description,
      category,
    } = draft;

    if (step === 0 && !uploadType) {
      setError("Pick how you want to add your project.");
      return;
    }
    if (step === 1) {
      if (!sourceLabel.trim()) {
        setError(
          uploadType === "link"
            ? "Paste a link to continue."
            : "Add a file or starter first.",
        );
        return;
      }
      if (uploadType === "link" && !/^https?:\/\//i.test(sourceLabel.trim())) {
        setError("That link needs to start with https://");
        return;
      }
      if (uploadType === "zip" && !packageReady) {
        setError("This project needs one more step — make your package ready.");
        return;
      }
    }
    if (step === 2) {
      if (!title.trim()) {
        setError("Add a title before you continue.");
        return;
      }
      if (description.trim().length < 8) {
        setError("Write a short description so people know what to try.");
        return;
      }
    }
    if (step === 3 && !category) {
      setError("Pick a category first.");
      return;
    }

    if (step >= steps.length - 1) {
      if (submitting) return;
      void (async () => {
        setSubmitting(true);
        try {
          let storagePath: string | null = null;
          if (uploadType === "zip" && zipFileRef.current) {
            const form = new FormData();
            form.append("file", zipFileRef.current);
            form.append("projectId", draft.id);
            form.append("ownerId", session.userId || "anon");
            const up = await fetch("/api/projects/upload", {
              method: "POST",
              body: form,
            });
            const upData = (await up.json()) as {
              storagePath?: string;
              error?: string;
              skipped?: boolean;
            };
            if (!up.ok && !upData.skipped) {
              setError(upData.error || "We couldn’t upload the ZIP yet.");
              return;
            }
            storagePath = upData.storagePath ?? null;
          }

          const payload = {
            id: draft.id,
            uploadType,
            sourceLabel,
            title: title.trim(),
            description: description.trim(),
            category,
            tags: draft.tags,
            thumbnail: draft.thumb,
            ownerId: session.userId,
            storagePath,
            playUrl:
              uploadType === "link" ? sourceLabel.trim() : null,
          };
          const res = await fetch("/api/projects/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = (await res.json()) as {
            submission?: ProjectSubmission;
            stages?: Array<{ name: string; ok: boolean; detail: string }>;
            error?: string;
            fallback?: {
              submission: ProjectSubmission;
              stages?: Array<{ name: string; ok: boolean; detail: string }>;
            };
          };
          const submission = data.submission ?? data.fallback?.submission;
          if (!submission) {
            setError(data.error || "We couldn’t submit this yet. Try again.");
            return;
          }
          const stages = data.stages ?? data.fallback?.stages ?? [];
          sessionStorage.setItem(
            "baiolo.last-pipeline-stages",
            JSON.stringify(stages),
          );
          upsert(submission);
          clearDraft();
          zipFileRef.current = null;
          router.push(`/create/submitted?id=${encodeURIComponent(draft.id)}`);
        } catch {
          setError("We couldn’t submit this yet. Try again.");
        } finally {
          setSubmitting(false);
        }
      })();
      return;
    }

    patch({ step: step + 1 });
  }

  function back() {
    setError("");
    patch({ step: Math.max(0, draft.step - 1) });
  }

  const signedIn = sessionReady && Boolean(session.email);

  return (
    <>
      <SiteHeader showJoin={false} />
      <main className="mx-auto w-full max-w-2xl px-5 py-10 pb-36 md:px-8 md:pb-10">
        {!signedIn && sessionReady && (
          <div className="mb-6 rounded-xl bg-lilac/50 px-5 py-4 text-sm text-ink">
            <span className="font-bold">Tip: </span>
            You can build a draft now.{" "}
            <a href="/auth?next=%2Fcreate" className="font-bold text-brand-strong underline">
              Join
            </a>{" "}
            before submit so we can save it to your account later.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-ink-muted">
              Add your project · step {draft.step + 1} of {steps.length}
            </p>
            <h1 className="mt-2 text-4xl font-extrabold">
              {steps[draft.step]}
            </h1>
          </div>
          <p
            className={cn(
              "text-sm font-bold text-ink-muted transition-opacity",
              savedFlash ? "opacity-100" : "opacity-40",
            )}
            aria-live="polite"
          >
            Draft saved
          </p>
        </div>

        <div
          className="mt-6 h-3 overflow-hidden rounded-pill bg-lilac"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={draft.step + 1}
        >
          <div
            className="h-full rounded-pill bg-brand transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-10 rounded-xl bg-surface p-6 shadow-[var(--shadow-1)] md:p-8">
          {draft.step === 0 && (
            <div className="space-y-3">
              <p className="text-ink-muted">
                Choose one simple way to start. You can save and come back
                later.
              </p>
              {uploadOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    patch({
                      uploadType: opt.id,
                      packageReady: opt.id !== "zip",
                      sourceLabel:
                        opt.id === "template" ? templates[0].id : "",
                      hints: [],
                    })
                  }
                  className={cn(
                    "w-full rounded-xl border-2 bg-surface p-5 text-left transition-all",
                    draft.uploadType === opt.id
                      ? "border-brand bg-lilac/40 shadow-[var(--shadow-1)]"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <p className="text-xl font-extrabold">{opt.title}</p>
                  <p className="mt-1 text-ink-muted">{opt.body}</p>
                </button>
              ))}
            </div>
          )}

          {draft.step === 1 && draft.uploadType === "zip" && (
            <div>
              <p className="text-lg font-bold">Add your files</p>
              <p className="mt-1 text-ink-muted">
                Don’t worry about perfect packaging — Baiolo can help.
              </p>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) applyFile(file);
                }}
                className={cn(
                  "mt-4 flex min-h-36 flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
                  draft.packageReady && draft.sourceLabel
                    ? "border-brand bg-lilac/30"
                    : dragOver
                      ? "border-brand bg-lilac/40"
                      : "border-border bg-canvas",
                )}
              >
                {draft.packageReady && draft.sourceLabel ? (
                  <>
                    <p className="font-bold text-ink">Package ready</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {draft.sourceLabel}
                      {draft.fileSizeLabel ? ` · ${draft.fileSizeLabel}` : ""}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-4"
                      onClick={() => fileRef.current?.click()}
                    >
                      Choose another ZIP
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-ink">Drop a ZIP here</p>
                    <p className="mt-1 text-sm text-ink-muted">or choose a file</p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-4"
                      onClick={() => fileRef.current?.click()}
                    >
                      Choose ZIP
                    </Button>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) applyFile(file);
                  }}
                />
              </div>

              <p className="mt-4 text-sm font-bold text-ink-muted">
                Or type a folder / file name
              </p>
              <input
                value={draft.sourceLabel}
                onChange={(e) =>
                  patch({
                    sourceLabel: e.target.value,
                    packageReady: false,
                    hints: [],
                  })
                }
                onBlur={() => tryAutoPackage(draft.sourceLabel)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    tryAutoPackage(draft.sourceLabel);
                  }
                }}
                placeholder="my-fun-game.zip or my-folder"
                className="mt-2 min-h-14 w-full rounded-pill border-2 border-border px-5 text-lg focus:border-brand focus:outline-none"
              />
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={runPackagingHelper}
              >
                Build my package
              </Button>
              <ul className="mt-4 space-y-1 text-sm text-ink-muted">
                <li>• ZIP preferred</li>
                <li>• A start file helps (like index.html)</li>
                <li>• Keep it light when you can</li>
              </ul>
              {draft.fileSizeLabel && (
                <p className="mt-3 text-sm text-ink-muted">
                  File size: {draft.fileSizeLabel}
                </p>
              )}
              {draft.sourceLabel.trim() && !draft.packageReady && (
                <div className="mt-4 rounded-lg bg-warning/15 px-4 py-3">
                  <p className="font-bold text-ink">Almost ready</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Press Enter, leave the field, or tap “Build my package” so
                    we can check it.
                  </p>
                </div>
              )}
              {draft.packageReady && (
                <div className="mt-4 space-y-2 rounded-lg bg-mint/50 px-4 py-3">
                  <p className="font-bold text-secondary-strong">
                    Your project package is ready.
                  </p>
                  {(draft.hints ?? []).map((h) => (
                    <p key={h} className="text-sm text-ink-muted">
                      {h}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {draft.step === 1 && draft.uploadType === "link" && (
            <label className="block">
              <span className="text-lg font-bold">Paste your link</span>
              <p className="mt-1 text-ink-muted">
                A demo link people can open and try.
              </p>
              <input
                value={draft.sourceLabel}
                onChange={(e) => patch({ sourceLabel: e.target.value })}
                placeholder="https://..."
                className="mt-4 min-h-14 w-full rounded-pill border-2 border-border px-5 text-lg focus:border-brand focus:outline-none"
              />
            </label>
          )}

          {draft.step === 1 && draft.uploadType === "template" && (
            <div>
              <p className="text-lg font-bold">Pick a starter</p>
              <p className="mt-1 text-ink-muted">
                Simple packs you can rename and make your own.
              </p>
              <div className="mt-4 space-y-3">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      patch({
                        sourceLabel: t.id,
                        packageReady: true,
                      })
                    }
                    className={cn(
                      "w-full rounded-xl border-2 bg-surface p-5 text-left transition-all",
                      draft.sourceLabel === t.id
                        ? "border-brand bg-lilac/40 shadow-[var(--shadow-1)]"
                        : "border-border hover:border-border-strong",
                    )}
                  >
                    <p className="text-xl font-extrabold">{t.label}</p>
                    <p className="mt-1 text-ink-muted">{t.body}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {draft.step === 2 && (
            <div className="space-y-5">
              <label className="block">
                <span className="text-lg font-bold">Title</span>
                <input
                  value={draft.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="Cloud Hopper"
                  className="mt-2 min-h-14 w-full rounded-pill border-2 border-border px-5 text-lg focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-lg font-bold">Short description</span>
                <textarea
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  rows={4}
                  placeholder="A tiny platformer where you bounce on soft clouds."
                  className="mt-2 w-full rounded-lg border-2 border-border p-4 text-base focus:border-brand focus:outline-none"
                />
              </label>
            </div>
          )}

          {draft.step === 3 && (
            <div>
              <p className="text-lg font-bold">What kind of project is this?</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <FilterPill
                    key={c.id}
                    label={c.label}
                    active={draft.category === c.id}
                    onClick={() => pickCategory(c.id)}
                  />
                ))}
              </div>

              <p className="mt-8 text-lg font-bold">Add a few tags</p>
              <p className="mt-1 text-ink-muted">
                Up to 5 soft labels — they help people find you in Explore.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ...(draft.category
                    ? defaultTagsForCategory[draft.category]
                    : []),
                  ...suggestedTags,
                ]
                  .filter((t, i, arr) => arr.indexOf(t) === i)
                  .map((t) => (
                    <FilterPill
                      key={t}
                      label={t}
                      active={draft.tags.includes(t)}
                      onClick={() => toggleTag(t)}
                    />
                  ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                  placeholder="Your own tag"
                  maxLength={24}
                  className="min-h-12 flex-1 rounded-pill border-2 border-border bg-surface px-5 text-ink placeholder:text-placeholder focus:border-brand focus:outline-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addCustomTag}
                  disabled={!tagInput.trim() || draft.tags.length >= 5}
                >
                  Add tag
                </Button>
              </div>
              {draft.tags.length > 0 && (
                <p className="mt-3 text-sm font-semibold text-ink-muted">
                  Selected: {draft.tags.join(" · ")}
                </p>
              )}
            </div>
          )}

          {draft.step === 4 && (
            <div>
              <p className="text-lg font-bold">Add a game screenshot</p>
              <p className="mt-1 text-ink-muted">
                Cards show this image — upload a real screen from your MVP so
                people know what they’ll play. Gradients are only a fallback.
              </p>
              <label className="mt-5 block">
                <span className="text-sm font-bold text-ink-muted">
                  Upload screenshot (best)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-sm text-ink-muted file:mr-3 file:rounded-pill file:border-0 file:bg-brand file:px-4 file:py-2 file:font-bold file:text-on-brand"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2_500_000) {
                      setError("That image is a bit big. Try a smaller one.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string") {
                        patch({ thumb: reader.result });
                        setError("");
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {draft.thumb.startsWith("data:") || draft.thumb.startsWith("/") ? (
                <div
                  className="mt-4 aspect-[4/3] rounded-lg border-4 border-brand bg-cover bg-center"
                  style={{ backgroundImage: `url(${draft.thumb})` }}
                  role="img"
                  aria-label="Screenshot preview"
                />
              ) : null}
              <p className="mt-5 text-sm font-bold text-ink-muted">
                Or pick a color vibe
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {THUMB_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => patch({ thumb: t })}
                    className={cn(
                      "aspect-[4/3] rounded-lg border-4 transition-transform hover:scale-[1.02]",
                      draft.thumb === t ? "border-brand" : "border-transparent",
                    )}
                    style={{ background: t }}
                    aria-label="Choose thumbnail vibe"
                  />
                ))}
              </div>
            </div>
          )}

          {draft.step === 5 && (
            <div>
              <p className="text-lg font-bold">Does this look right?</p>
              <p className="mt-1 text-ink-muted">
                Next you send it for checking — not live yet.
              </p>
              {(draft.hints ?? []).length > 0 && (
                <div className="mt-4 rounded-lg bg-warning/15 px-4 py-3 text-sm font-semibold">
                  {draft.hints![0]}
                </div>
              )}
              <div className="mt-6 overflow-hidden rounded-xl border border-border shadow-[var(--shadow-1)]">
                <div
                  className="aspect-[4/3] bg-cover bg-center"
                  style={thumbBackgroundStyle(draft.thumb)}
                />
                <div className="p-5">
                  <p className="text-xl font-extrabold">
                    {draft.title || "Untitled idea"}
                  </p>
                  <p className="mt-1 text-sm capitalize text-ink-muted">
                    {draft.category || "uncategorized"} ·{" "}
                    {draft.uploadType || "upload"}
                  </p>
                  {draft.tags.length > 0 && (
                    <p className="mt-2 text-sm font-semibold text-brand-strong">
                      {draft.tags.join(" · ")}
                    </p>
                  )}
                  <p className="mt-3 text-ink-muted">
                    {draft.description || "No description yet."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {draft.step === 6 && (
            <div>
              <p className="text-lg font-bold">Submit for checking</p>
              <p className="mt-2 text-ink-muted">
                We’ll check your project safely. A Baiolo teammate also reviews
                it before it can go public.
              </p>
              <ul className="mt-5 space-y-2 text-ink-muted">
                <li>• Private storage first</li>
                <li>• Friendly automated check</li>
                <li>• Human approval before publish</li>
              </ul>
            </div>
          )}

          {error && (
            <p className="mt-5 rounded-lg bg-danger/10 px-4 py-3 font-semibold text-danger">
              {error}
            </p>
          )}

          <div className="mt-8 hidden md:block">{renderActions()}</div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-2)] backdrop-blur md:hidden">
        <div className="mx-auto max-w-2xl">
          {error && (
            <p className="mb-2 line-clamp-2 text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          {renderActions(true)}
        </div>
      </div>
    </>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <>
          <SiteHeader showJoin={false} />
          <main className="mx-auto max-w-2xl px-5 py-16 text-ink-muted">
            Loading creator…
          </main>
        </>
      }
    >
      <CreateWizard />
    </Suspense>
  );
}
