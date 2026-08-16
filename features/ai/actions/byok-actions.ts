"use server";

import { cookies } from "next/headers";
import { requireUser } from "@/features/auth/actions/require-user";
import { prisma } from "@/lib/db";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto/byok-cipher";

/** Name of the httpOnly cookie used as a short-lived cache for the resolved key. */
const BYOK_COOKIE = "quark_byok_key";

/**
 * The cookie is a cache, not the source of truth — Postgres is. Five minutes
 * keeps most chat sessions warm without ever going stale for long if the
 * underlying key is rotated or removed.
 */
const BYOK_CACHE_MAX_AGE_SECONDS = 60 * 5;

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
 * Reports whether the signed-in user currently has a BYOK key saved.
 * Checks the cache cookie first; falls back to a DB read only if the cookie
 * is cold. Never exposes the key value itself to the client.
 */
export async function getByokStatus() {
  const user = await requireUser();
  const store = await cookies();

  if (store.get(BYOK_COOKIE)?.value) {
    return { hasKey: true };
  }

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { openAiApiKey: true },
  });

  return { hasKey: Boolean(row?.openAiApiKey) };
}

/**
 * Validates a user-supplied OpenAI API key (format + a live check against
 * OpenAI), encrypts it, and persists it on the user's row. Also warms the
 * cache cookie immediately so the next message doesn't need a DB round-trip.
 *
 * @throws {Error} When the key is missing, malformed, or rejected by OpenAI.
 */
export async function saveByokKey(apiKey: string) {
  const user = await requireUser();

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

  await prisma.user.update({
    where: { id: user.id },
    data: { openAiApiKey: encryptApiKey(trimmed) },
  });

  const store = await cookies();
  store.set(BYOK_COOKIE, trimmed, {
    ...baseCookieOptions(),
    maxAge: BYOK_CACHE_MAX_AGE_SECONDS,
  });

  return { success: true };
}

/** Removes the saved BYOK key from both Postgres and the cache cookie. */
export async function deleteByokKey() {
  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: { openAiApiKey: null },
  });

  const store = await cookies();
  store.set(BYOK_COOKIE, "", { ...baseCookieOptions(), maxAge: 0 });

  return { success: true };
}

/**
 * Resolves the current user's OpenAI key for a single request:
 *
 * 1. Cookie present → return it, no DB call at all (the hot path for almost
 *    every message once a session is warm).
 * 2. Cookie absent → read the encrypted key from Postgres. If present,
 *    decrypt it, write it back into the cookie (5 min), and return it.
 * 3. Not in Postgres either → return `undefined` so the caller can surface
 *    "no key configured" instead of silently using any shared server key.
 *
 * Safe to call from both a Route Handler (the chat endpoint) and a Server
 * Action invoked from client code (see `ByokWarmer`) — both contexts allow
 * cookie mutation. Do NOT call this from a Server Component render.
 */
export async function resolveByokKey(): Promise<string | undefined> {
  const user = await requireUser();
  const store = await cookies();

  const cached = store.get(BYOK_COOKIE)?.value;
  if (cached) {
    return cached;
  }

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { openAiApiKey: true },
  });

  if (!row?.openAiApiKey) {
    return undefined;
  }

  const plainKey = decryptApiKey(row.openAiApiKey);

  store.set(BYOK_COOKIE, plainKey, {
    ...baseCookieOptions(),
    maxAge: BYOK_CACHE_MAX_AGE_SECONDS,
  });

  return plainKey;
}
