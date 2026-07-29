/** Social login providers Baiolo exposes via Supabase Auth. */
export const SOCIAL_PROVIDERS = [
  { id: "google", label: "Google", hint: "Continue with Google", visible: true },
  {
    id: "facebook",
    label: "Facebook",
    hint: "Continue with Facebook",
    visible: false,
  },
  { id: "apple", label: "Apple", hint: "Continue with Apple", visible: false },
  {
    id: "discord",
    label: "Discord",
    hint: "Continue with Discord",
    visible: true,
  },
  { id: "slack", label: "Slack", hint: "Continue with Slack", visible: false },
] as const;

export type SocialProviderId = (typeof SOCIAL_PROVIDERS)[number]["id"];

/** Providers shown on the Join / sign-in screen. */
export const VISIBLE_SOCIAL_PROVIDERS = SOCIAL_PROVIDERS.filter((p) => p.visible);

export function isSocialProvider(value: string): value is SocialProviderId {
  return SOCIAL_PROVIDERS.some((p) => p.id === value);
}

export function labelForProvider(id: SocialProviderId) {
  return SOCIAL_PROVIDERS.find((p) => p.id === id)?.label ?? id;
}

export function friendlyOAuthError(provider: SocialProviderId, detail = "") {
  const label = labelForProvider(provider);
  const lower = detail.toLowerCase();
  if (lower.includes("not enabled") || lower.includes("unsupported provider")) {
    return `${label} isn’t enabled in Supabase Auth yet. Turn it on under Authentication → Providers, or use WhatsApp / email.`;
  }
  if (detail.trim()) return detail;
  return `Couldn’t start ${label} sign-in.`;
}
