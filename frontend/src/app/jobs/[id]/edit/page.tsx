"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { JobForm } from "@/components/job-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/skeleton";
import { api, Job } from "@/lib/api";

function EditJobContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    void api<Job>(`/api/jobs/${id}`).then((r) => {
      if (r.data) setJob(r.data);
    });
  }, [id]);

  async function onSubmit(payload: Record<string, unknown>) {
    const res = await api<Job>(`/api/jobs/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    if (res.error) throw new Error(res.error);
    router.push(`/jobs/${id}`);
  }

  if (!job) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="Edit job" description={job.name} />
      <Card>
        <CardBody className="py-8">
          <JobForm initial={job} submitLabel="Save changes" onSubmit={onSubmit} />
        </CardBody>
      </Card>
    </div>
  );
}

export default function EditJobPage() {
  return <AuthGuard><EditJobContent /></AuthGuard>;
}
