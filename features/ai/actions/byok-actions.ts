"use server";

import { cookies } from "next/headers";
import { requireUser } from "@/features/auth/action/require-user";

/** Name of the httpOnly cookie that stores the user's raw OpenAI API key. */
const BYOK_COOKIE = "quark_byok_key";

/**
 * Chrome caps Set-Cookie Max-Age at 400 days and silently truncates anything
 * longer, so there's no benefit to asking for more than that.
 */
const BYOK_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

const KEY_FORMAT = /^sk-[A-Za-z0-9_-]{16,}$/;

/** Cookie attributes shared by every set/delete call, kept in one place so they can't drift apart. */
function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

/**
 * Reports whether the signed-in user currently has a BYOK key saved, without
 * ever exposing the key value itself to the client.
 */
export async function getByokStatus() {
  await requireUser();
  const store = await cookies();
  return { hasKey: Boolean(store.get(BYOK_COOKIE)?.value) };
}

/**
 * Validates a user-supplied OpenAI API key (format + a live check against
 * OpenAI) and stores it in an httpOnly cookie if valid.
 *
 * @throws {Error} When the key is missing, malformed, or rejected by OpenAI.
 */
export async function saveByokKey(apiKey: string) {
  await requireUser();

  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error("API key is required");
  }
  if (!KEY_FORMAT.test(trimmed)) {
    throw new Error("That doesn't look like a valid OpenAI API key");
  }

  let verifyResponse: Response;
  try {
    verifyResponse = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${trimmed}` },
    });
  } catch {
    throw new Error("Could not reach OpenAI to verify the key. Try again.");
  }

  if (!verifyResponse.ok) {
    throw new Error("Invalid OpenAI API key. Authentication with OpenAI failed.");
  }

  const store = await cookies();
  store.set(BYOK_COOKIE, trimmed, {
    ...baseCookieOptions(),
    maxAge: BYOK_MAX_AGE_SECONDS,
  });

  return { success: true };
}

/** Removes the saved BYOK key; subsequent chat requests fall back to the app's default key. */
export async function deleteByokKey() {
  await requireUser();
  const store = await cookies();
  store.set(BYOK_COOKIE, "", { ...baseCookieOptions(), maxAge: 0 });
  return { success: true };
}

/**
 * Server-only helper for the chat route. Reads the raw key straight off the
 * cookie store — never exported to a client component, never sent over the
 * wire to the browser again.
 */
export async function readByokKey(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(BYOK_COOKIE)?.value || undefined;
}
