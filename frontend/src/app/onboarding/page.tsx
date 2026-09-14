"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { api, User } from "@/lib/api";
import { markOnboardingComplete } from "@/lib/onboarding";

function OnboardingContent() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    void api<User>("/api/auth/me").then((r) => {
      if (r.data) setUser(r.data);
    });
  }, []);

  function finish() {
    if (user) markOnboardingComplete(user.id);
    router.push("/jobs/new");
  }

  function skipToDashboard() {
    if (user) markOnboardingComplete(user.id);
    router.push("/dashboard");
  }

  const steps = [
    {
      title: "Welcome to ResolveRun",
      body: "You automate HTTP jobs — on a schedule or on demand — with full execution history and worker-backed runs.",
    },
    {
      title: "Risk levels matter",
      body: "LOW jobs (reads) retry freely. HIGH jobs (payments, writes) pause on uncertain outcomes so you never double-charge by accident.",
    },
    {
      title: "UNKNOWN ≠ FAILED",
      body: "A network timeout after sending a POST might mean the server already succeeded. We surface UNKNOWN, block auto-retry, and let you verify or retry manually.",
    },
  ];

  const current = steps[step];

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-lg">
        <CardBody className="py-8">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
            Step {step + 1} of {steps.length}
          </p>
          <h1 className="mt-2 text-xl font-semibold text-neutral-900">{current.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-neutral-600">{current.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {step < steps.length - 1 ? (
              <>
                <Button onClick={() => setStep(step + 1)}>Continue</Button>
                <Button variant="ghost" onClick={skipToDashboard}>Skip tour</Button>
              </>
            ) : (
              <>
                <Button onClick={finish}>Create your first job</Button>
                <Button variant="secondary" onClick={skipToDashboard}>Go to dashboard</Button>
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingContent />
    </AuthGuard>
  );
}
