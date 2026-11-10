"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isFamilyName } from "@/lib/config";
import {
  checkFamilyPassword,
  clearSessionCookie,
  getSession,
  setSessionCookie,
} from "@/lib/session";

export type FormState = { error: string } | null;

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * One shared password means one thing worth guessing, so slow down repeat
 * attempts. This lives in memory, which is enough for a family site; it
 * resets when the server restarts.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

async function tooManyAttempts(): Promise<boolean> {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const now = Date.now();
  // Forget expired records so the map can't grow without limit.
  if (attempts.size > 1000) {
    for (const [key, value] of attempts) if (value.resetAt < now) attempts.delete(key);
  }
  const record = attempts.get(ip);

  if (!record || record.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  record.count += 1;
  return record.count > MAX_ATTEMPTS;
}

export async function loginAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const password = String(formData.get("password") ?? "");

  if (!password) {
    return { error: "Please type the family password." };
  }

  if (await tooManyAttempts()) {
    return {
      error: "Too many tries. Please wait about fifteen minutes and try again.",
    };
  }

  if (!checkFamilyPassword(password)) {
    return { error: "That password did not match. Please try again." };
  }

  // Logged in, but we still need to know which relative this is.
  await setSessionCookie("");
  redirect("/who");
}

export async function chooseNameAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) return { error: "Please log in again." };

  const name = String(formData.get("name") ?? "").trim();
  if (!isFamilyName(name)) {
    return { error: "Please tap your name in the list." };
  }

  await setSessionCookie(name);
  redirect("/newsletter");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
