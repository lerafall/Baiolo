/**
 * Thin billing adapter — swap `manual` for Stripe/etc. later
 * without changing AI quotas (`plans.config` / `ai-usage`).
 */

import type { UserPlan } from "@/lib/plans.config";

export type CheckoutResult =
  | { ok: true; mode: "redirect"; url: string }
  | { ok: true; mode: "manual"; message: string }
  | { ok: false; error: string };

export type WebhookResult =
  | { ok: true; userId: string; plan: UserPlan }
  | { ok: false; error: string };

export type BillingProvider = {
  id: "manual" | "stripe" | string;
  /** Paid plans cannot self-serve until a real provider is wired. */
  allowsSelfServeUpgrade: boolean;
  startCheckout(input: {
    userId: string;
    email: string | null;
    plan: Exclude<UserPlan, "free">;
  }): Promise<CheckoutResult>;
  handleWebhook(_rawBody: string, _signature: string | null): Promise<WebhookResult>;
  cancel(_userId: string): Promise<{ ok: boolean; detail: string }>;
};

const contactEmail =
  process.env.NEXT_PUBLIC_BAIOLO_CONTACT_EMAIL?.trim() ||
  process.env.BAIOLO_CONTACT_EMAIL?.trim() ||
  "hello@baiolo.com";

/** Current production provider: admin award / contact only. */
export const manualBillingProvider: BillingProvider = {
  id: "manual",
  allowsSelfServeUpgrade: false,
  async startCheckout({ plan, email }) {
    const subject = encodeURIComponent(`Baiolo ${plan} upgrade`);
    const body = encodeURIComponent(
      `Hi Baiolo team,\n\nI'd like to upgrade to ${plan}.\nAccount: ${email || "(signed in)"}\n`,
    );
    return {
      ok: true,
      mode: "manual",
      message: `mailto:${contactEmail}?subject=${subject}&body=${body}`,
    };
  },
  async handleWebhook() {
    return {
      ok: false,
      error: "No external billing webhook configured (manual provider).",
    };
  },
  async cancel() {
    return { ok: false, detail: "Cancel via admin / support (manual provider)." };
  },
};

export function getBillingProvider(): BillingProvider {
  const id = process.env.BAIOLO_BILLING_PROVIDER?.trim().toLowerCase();
  // Future: if (id === "stripe") return stripeBillingProvider;
  void id;
  return manualBillingProvider;
}

export function billingContactEmail() {
  return contactEmail;
}

/** Self-serve account API may only set Free until an external provider is live. */
export function canSelfServeSetPlan(plan: UserPlan): boolean {
  if (plan === "free") return true;
  return getBillingProvider().allowsSelfServeUpgrade;
}
