"use client";

import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { api, User } from "@/lib/api";
import { isOnboardingComplete } from "@/lib/onboarding";
import { logoutAndLeave } from "@/lib/session";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function ProfileContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    void api<User>("/api/auth/me").then((r) => {
      if (r.data) setUser(r.data);
    });
  }, []);

  async function logout() {
    await logoutAndLeave();
  }

  function resetOnboarding() {
    if (user) {
      localStorage.removeItem(`resolverun_onboarding_complete_${user.id}`);
      router.push("/onboarding");
    }
  }

  if (!user) {
    return <p className="text-neutral-500">Loading profile…</p>;
  }

  return (
    <div>
      <PageHeader title="Profile & settings" description="Account and workspace preferences" />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Account" />
          <CardBody>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-neutral-500">Email</dt>
                <dd className="font-medium text-neutral-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">User ID</dt>
                <dd className="font-mono text-xs text-neutral-600">{user.id}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Session" />
          <CardBody className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={logout}>Sign out</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Onboarding" />
          <CardBody>
            <p className="text-sm text-neutral-600">
              Tour completed: {isOnboardingComplete(user.id) ? "Yes" : "No"}
            </p>
            <Button variant="ghost" className="mt-3" onClick={resetOnboarding}>
              Replay welcome tour
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
