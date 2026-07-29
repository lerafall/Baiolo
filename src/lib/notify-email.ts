/**
 * Optional email notify via Resend when configured.
 * Falls back to console log so local/dev still works.
 */

export type NotifyEvent =
  | "published"
  | "needs_changes"
  | "rejected"
  | "in_review"
  | "invite"
  | "request_public";

function isProductionLike() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function resolveFromAddress(): { from: string; warn?: string } {
  const configured = process.env.NOTIFY_EMAIL_FROM?.trim();
  if (configured) return { from: configured };
  if (isProductionLike()) {
    console.warn(
      "[baiolo-notify] NOTIFY_EMAIL_FROM is unset in production — using Resend onboarding address (verify your domain).",
    );
  }
  return {
    from: "Baiolo <onboarding@resend.dev>",
    warn: "default_from",
  };
}

export async function notifyCreatorEmail(options: {
  to: string | null | undefined;
  projectTitle: string;
  projectId: string;
  event: NotifyEvent;
  note?: string | null;
}): Promise<{ sent: boolean; detail: string }> {
  const to = options.to?.trim();
  if (!to || !to.includes("@")) {
    return { sent: false, detail: "no_email" };
  }

  const site =
    (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://baiolo.com")
      .trim()
      .replace(/\/$/, "");
  const link = `${site}/project/${options.projectId}`;

  const subjects: Record<NotifyEvent, string> = {
    published: `“${options.projectTitle}” is live on Baiolo`,
    needs_changes: `“${options.projectTitle}” needs a small fix`,
    rejected: `Update on “${options.projectTitle}”`,
    in_review: `“${options.projectTitle}” is in review`,
    invite: `You’re invited to play “${options.projectTitle}” on Baiolo`,
    request_public: `“${options.projectTitle}” was queued for public review`,
  };

  const bodies: Record<NotifyEvent, string> = {
    published: `Good news — your project is public.\n\nOpen it: ${link}`,
    needs_changes: `A Baiolo teammate asked for a small change.\n\n${options.note || ""}\n\nOpen: ${link}`,
    rejected: `We can’t publish this project right now.\n\n${options.note || ""}\n\nOpen: ${link}`,
    in_review: `Your project is in the human review queue.\n\nOpen: ${link}`,
    invite: `Someone shared a private Baiolo project with you.\n\nSign in with this email, then open: ${link}\n\n${options.note || ""}`,
    request_public: `Your request to share publicly is in the review queue.\n\nOpen: ${link}`,
  };

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const { from } = resolveFromAddress();

  if (!apiKey) {
    if (isProductionLike()) {
      console.warn(
        "[baiolo-notify] RESEND_API_KEY missing in production — email not sent.",
        { event: options.event, to },
      );
    } else {
      console.info("[baiolo-notify]", {
        to,
        event: options.event,
        subject: subjects[options.event],
      });
    }
    return { sent: false, detail: "logged_only" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: subjects[options.event],
        text: bodies[options.event],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.warn("[baiolo-notify] resend failed", {
        status: res.status,
        detail: detail.slice(0, 200),
      });
      return { sent: false, detail: detail.slice(0, 200) };
    }
    return { sent: true, detail: "resend_ok" };
  } catch (e) {
    return {
      sent: false,
      detail: e instanceof Error ? e.message : "network",
    };
  }
}
