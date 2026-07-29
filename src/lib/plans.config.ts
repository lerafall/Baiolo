export type UserPlan = "free" | "pro" | "studio";
export type AnalyticsTier = "basic" | "trends" | "export_api";
export type ReviewQueueTier = "standard" | "priority" | "dedicated_sla";

export const PLAN_LIMITS = {
  free: {
    activeAiProjects: 1,
    aiGenerationsPerMonth: 3,
    externalProjects: Number.POSITIVE_INFINITY,
    analytics: "basic",
    reviewQueue: "standard",
  },
  pro: {
    activeAiProjects: 10,
    aiGenerationsPerMonth: 100,
    externalProjects: Number.POSITIVE_INFINITY,
    analytics: "trends",
    reviewQueue: "priority",
  },
  studio: {
    activeAiProjects: Number.POSITIVE_INFINITY,
    aiGenerationsPerMonth: 500,
    externalProjects: Number.POSITIVE_INFINITY,
    analytics: "export_api",
    reviewQueue: "dedicated_sla",
  },
} as const satisfies Record<
  UserPlan,
  {
    activeAiProjects: number;
    aiGenerationsPerMonth: number;
    externalProjects: number;
    analytics: AnalyticsTier;
    reviewQueue: ReviewQueueTier;
  }
>;

export function isUserPlan(value: unknown): value is UserPlan {
  return value === "free" || value === "pro" || value === "studio";
}

export function normalizeUserPlan(value: unknown): UserPlan {
  if (value === "paid" || value === "paid_basic" || value === "pro") return "pro";
  if (value === "paid_pro" || value === "studio") return "studio";
  return "free";
}

/** Higher = sooner in the moderation queue. */
export function reviewQueueRank(plan: unknown): number {
  const p = normalizeUserPlan(plan);
  const tier = PLAN_LIMITS[p].reviewQueue;
  if (tier === "dedicated_sla") return 2;
  if (tier === "priority") return 1;
  return 0;
}

export function analyticsTierAtLeast(
  plan: unknown,
  needed: AnalyticsTier,
): boolean {
  const p = normalizeUserPlan(plan);
  const have = PLAN_LIMITS[p].analytics;
  const order: AnalyticsTier[] = ["basic", "trends", "export_api"];
  return order.indexOf(have) >= order.indexOf(needed);
}

