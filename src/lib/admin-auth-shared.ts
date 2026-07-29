/** Shared between Node route handlers and Edge middleware (Web Crypto only). */

export const ADMIN_GATE_COOKIE = "baiolo_admin_gate";

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** HMAC-SHA256 gate token — works in Node and Edge. */
export async function adminGateToken(serverCode: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(serverCode),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode("baiolo-admin-gate"),
  );
  return toHex(sig);
}

export async function cookieMatchesAdminGate(
  token: string | undefined,
  serverCode: string,
) {
  if (!token || !serverCode) return false;
  const expected = await adminGateToken(serverCode);
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i += 1) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
