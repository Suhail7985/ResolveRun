"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, User } from "@/lib/api";
import { consumeLogoutFlag } from "@/lib/session";

/** Optional: send signed-in users to the app. Never blocks the landing page. */
export function LoggedInRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (consumeLogoutFlag()) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await api<User>("/api/auth/me");
        if (!cancelled && res.data?.id) {
          router.replace("/dashboard");
        }
      } catch {
        // Landing must still render if the API is down.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
