/**
 * A short fingerprint of the current family password, stored inside every
 * login. When FAMILY_PASSWORD is changed, logins made with the old password no
 * longer match and are sent back to the login screen, so changing the password
 * really does lock out anyone who had the old one.
 *
 * Keyed with SESSION_SECRET, so the stamp reveals nothing about the password.
 * Uses Web Crypto so the proxy and the server actions compute the same value.
 */
export async function passwordStamp(password: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`pw:${password}`)));
  return Array.from(mac.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}
