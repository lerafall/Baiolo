import { PLAN_LIMITS, type UserPlan } from "@/lib/plans.config";

export type AiPlan = UserPlan;

export function resolveAiPlan(options: {
  userId?: string | null;
  email?: string | null;
  explicit?: AiPlan | null;
}): AiPlan {
  if (
    options.explicit === "free" ||
    options.explicit === "pro" ||
    options.explicit === "studio"
  ) {
    return options.explicit;
  }

  const proIds = (process.env.BAIOLO_PRO_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const proEmails = (process.env.BAIOLO_PRO_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const studioIds = (process.env.BAIOLO_STUDIO_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const studioEmails = (process.env.BAIOLO_STUDIO_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const uid = options.userId ?? null;
  const email = options.email?.toLowerCase() ?? null;

  if (uid && studioIds.includes(uid)) return "studio";
  if (email && studioEmails.includes(email)) return "studio";

  if (uid && proIds.includes(uid)) return "pro";
  if (email && proEmails.includes(email)) return "pro";

  return "free";
}

export function aiBuildLimit(plan: AiPlan) {
  return PLAN_LIMITS[plan].aiGenerationsPerMonth;
}

export function consumeServerAiBuild(options: {
  userId?: string | null;
  email?: string | null;
  plan?: AiPlan | null;
}): { ok: true; used: number; limit: number; plan: AiPlan } | {
  ok: false;
  used: number;
  limit: number;
  plan: AiPlan;
  error: string;
} {
  const plan = resolveAiPlan({
    userId: options.userId,
    email: options.email,
    explicit: options.plan,
  });
  return { ok: true, used: 0, limit: aiBuildLimit(plan), plan };
}

export function peekServerAiQuota(options: {
  userId?: string | null;
  email?: string | null;
  plan?: AiPlan | null;
}) {
  const plan = resolveAiPlan(options);
  const limit = aiBuildLimit(plan);
  return { plan, used: 0, limit, remaining: limit };
}
