"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, User } from "@/lib/api";
import { isOnboardingComplete } from "@/lib/onboarding";
import { AppSidebar } from "./layout/app-sidebar";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await api<User>("/api/auth/me");
      if (!res.data) {
        router.replace("/");
        return;
      }
      setUser(res.data);

      const onboarded = isOnboardingComplete(res.data.id);
      const onOnboarding = pathname.startsWith("/onboarding");

      if (!onboarded && !onOnboarding) {
        router.replace("/onboarding");
        return;
      }
      if (onboarded && onOnboarding) {
        router.replace("/dashboard");
        return;
      }

      setLoading(false);
    })();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-neutral-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  if (!user) return null;

  if (pathname.startsWith("/onboarding")) {
    return <>{children}</>;
  }

  return <AppSidebar email={user.email}>{children}</AppSidebar>;
}
