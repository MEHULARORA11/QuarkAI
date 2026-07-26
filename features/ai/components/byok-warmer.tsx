"use client";

import { useEffect } from "react";
import { resolveByokKey } from "@/features/ai/actions/byok-actions";

/**
 * Fires once when the authenticated app shell mounts (i.e. right after
 * sign-in) so the BYOK cache cookie is warmed from Postgres before the user
 * sends their first message. Renders nothing.
 *
 * Must be a client component calling the server action from useEffect —
 * cookies().set() cannot be called during a Server Component render.
 */
export function ByokWarmer() {
  useEffect(() => {
    void resolveByokKey();
  }, []);

  return null;
}
