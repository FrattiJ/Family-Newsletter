import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env, isFamilyName } from "./config";

export const SESSION_COOKIE = "fn_session";

/** Two months, so relatives are not asked to log in over and over. */
const SESSION_MAX_AGE = 60 * 60 * 24 * 60;

export type Session = {
  /** Which family member is using the site, for the byline. */
  name: string;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.sessionSecret);
}

export async function createSessionToken(name: string): Promise<string> {
  return new SignJWT({ name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const name = typeof payload.name === "string" ? payload.name : "";
    // An empty name means "logged in but hasn't told us who they are yet".
    return { name };
  } catch {
    return null;
  }
}

export async function setSessionCookie(name: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(name), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * Use this at the top of every server action. Proxy rules guard page
 * navigations, but server actions are reachable by direct POST, so each one
 * has to check for itself.
 */
export async function requireFamilyMember(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Please log in again.");
  if (!session.name || !isFamilyName(session.name)) {
    throw new Error("Please choose your name again.");
  }
  return session;
}

export function checkFamilyPassword(attempt: string): boolean {
  const expected = Buffer.from(env.familyPassword);
  const given = Buffer.from(attempt ?? "");
  // Compare hashes so the two buffers are always the same length.
  const h = (b: Buffer) => createHmac("sha256", env.sessionSecret).update(b).digest();
  return timingSafeEqual(h(expected), h(given));
}

/**
 * Photos are private, but email clients cannot send our login cookie. Each
 * photo therefore gets a long, unguessable token that unlocks just that one
 * image.
 */
export function photoToken(photoId: string): string {
  return createHmac("sha256", env.sessionSecret)
    .update(`photo:${photoId}`)
    .digest("hex")
    .slice(0, 32);
}

export function photoTokenValid(photoId: string, token: string | null): boolean {
  if (!token) return false;
  const expected = Buffer.from(photoToken(photoId));
  const given = Buffer.from(token);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}
