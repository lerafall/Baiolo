"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DictationField } from "@/components/ui/DictationField";
import { useToast } from "@/components/ui/Toast";
import type { ProjectSubmission } from "@/lib/moderation";
import { useT } from "@/lib/i18n/LocaleProvider";

type Props = {
  project: ProjectSubmission;
  onUpdated: (next: ProjectSubmission) => void;
};

export function OwnerShareControls({ project, onUpdated }: Props) {
  const t = useT();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const isPublic = project.status === "published" || project.visibility === "public";
  const pending = project.visibility === "pending_public";

  async function requestPublic() {
    setBusy(true);
    try {
      const res = await fetch("/api/projects/request-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      const data = (await res.json()) as {
        project?: ProjectSubmission;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.project) {
        push(data.error || t("collab.requestFail"), "warn");
        return;
      }
      onUpdated(data.project);
      push(t("collab.requestOk"));
    } catch {
      push(t("collab.requestFail"), "warn");
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      push(t("collab.badEmail"), "warn");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/projects/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, email: trimmed }),
      });
      const data = (await res.json()) as {
        project?: ProjectSubmission;
        error?: string;
      };
      if (!res.ok || !data.project) {
        push(data.error || t("collab.inviteFail"), "warn");
        return;
      }
      onUpdated(data.project);
      setEmail("");
      push(t("collab.inviteOk"));
    } catch {
      push(t("collab.inviteFail"), "warn");
    } finally {
      setBusy(false);
    }
  }

  if (isPublic) return null;

  return (
    <section className="mt-8 rounded-xl border-2 border-border bg-surface p-5 shadow-[var(--shadow-1)]">
      <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
        {t("collab.eyebrow")}
      </p>
      <h2 className="mt-2 text-xl font-extrabold">{t("collab.title")}</h2>
      <p className="mt-1 text-ink-muted">{t("collab.body")}</p>

      <div className="mt-5">
        <Button
          type="button"
          size="l"
          disabled={busy || pending}
          onClick={() => void requestPublic()}
        >
          {pending ? t("collab.pending") : t("collab.requestPublic")}
        </Button>
        <p className="mt-2 text-sm text-ink-muted">{t("collab.requestHint")}</p>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <p className="font-bold">{t("collab.inviteTitle")}</p>
        <p className="mt-1 text-sm text-ink-muted">{t("collab.inviteBody")}</p>
        <DictationField className="mt-3" value={email} onChange={setEmail} append={false}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@email.com"
            className="min-h-12 w-full rounded-pill border-2 border-border px-5 focus:border-brand focus:outline-none"
          />
        </DictationField>
        <Button
          type="button"
          className="mt-3"
          variant="secondary"
          disabled={busy}
          onClick={() => void invite()}
        >
          {t("collab.invite")}
        </Button>
        {(project.sharedWith || []).length > 0 && (
          <p className="mt-3 text-sm text-ink-muted">
            {t("collab.sharedWith", {
              list: (project.sharedWith || []).join(", "),
            })}
          </p>
        )}
      </div>
    </section>
  );
}
