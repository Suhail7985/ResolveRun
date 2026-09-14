"use client";

import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { JobForm } from "@/components/job-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { api, Job } from "@/lib/api";

function NewJobContent() {
  const router = useRouter();

  async function onSubmit(payload: Record<string, unknown>) {
    const res = await api<Job>("/api/jobs", { method: "POST", body: JSON.stringify(payload) });
    if (res.error) throw new Error(res.error);
    router.push(`/jobs/${res.data!.id}`);
  }

  return (
    <div>
      <PageHeader title="Create job" description="Define an HTTP job — configuration is snapshotted per execution" />
      <Card>
        <CardBody className="py-8">
          <JobForm submitLabel="Create job" onSubmit={onSubmit} />
        </CardBody>
      </Card>
    </div>
  );
}

export default function NewJobPage() {
  return <AuthGuard><NewJobContent /></AuthGuard>;
}
