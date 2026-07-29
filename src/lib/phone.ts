/** Normalize user phone input to E.164-ish (+digits). */
export function normalizePhone(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8) return "";
  return hasPlus || trimmed.startsWith("00") ? `+${digits.replace(/^00/, "")}` : `+${digits}`;
}
