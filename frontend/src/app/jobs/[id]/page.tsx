"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { StatusBadge } from "@/components/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { api, Execution, Job, maskHeaders } from "@/lib/api";

function JobDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [runMsg, setRunMsg] = useState("");

  const load = useCallback(async () => {
    const [j, e] = await Promise.all([
      api<Job>(`/api/jobs/${id}`),
      api<{ items: Execution[] }>(
        `/api/jobs/${id}/executions${statusFilter ? `?status=${statusFilter}` : ""}`
      ),
    ]);
    if (j.data) setJob(j.data);
    if (e.data) setExecutions(e.data.items);
  }, [id, statusFilter]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [load]);

  async function runNow() {
    setRunMsg("");
    const res = await api(`/api/jobs/${id}/run`, {
      method: "POST",
      headers: { "Idempotency-Key": `manual-${Date.now()}` },
    });
    if (res.error) setRunMsg(res.error);
    else setRunMsg("Execution queued — refresh or open Executions");
    await load();
  }

  if (!job) return <PageSkeleton />;

  const cfg = { ...job.configuration, headers: maskHeaders(job.configuration.headers) };

  return (
    <div>
      <PageHeader
        title={job.name}
        description={job.description ?? "HTTP job"}
        action={
          <div className="flex gap-2">
            <Button onClick={runNow}>Run now</Button>
            <Link href={`/jobs/${id}/edit`}><Button variant="secondary">Edit</Button></Link>
          </div>
        }
      />
      {runMsg && (
        <div className="mb-4">
          <Alert variant={runMsg.includes("queued") ? "success" : "error"}>{runMsg}</Alert>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Configuration snapshot context" description="Live job config (secrets masked)" />
          <CardBody>
            <pre className="overflow-auto rounded-lg bg-neutral-50 p-4 text-xs">{JSON.stringify(cfg, null, 2)}</pre>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Schedule & risk" />
          <CardBody className="space-y-2 text-sm">
            <p><span className="text-neutral-500">Risk:</span> <strong>{job.riskLevel}</strong></p>
            <p><span className="text-neutral-500">Schedule:</span> {job.schedule ?? "Manual only"}</p>
            <p><span className="text-neutral-500">Enabled:</span> {job.enabled ? "Yes" : "No"}</p>
            <p><span className="text-neutral-500">Next run:</span> {job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : "—"}</p>
            <p><span className="text-neutral-500">Last run:</span> {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : "—"}</p>
          </CardBody>
        </Card>
      </div>
      <Card className="mt-8 overflow-hidden">
        <CardHeader
          title="Execution history"
          action={
            <select
              className="rounded-lg border border-neutral-200 px-2 py-1 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              {["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "UNKNOWN", "VERIFYING"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          }
        />
        {executions.length === 0 ? (
          <EmptyState title="No executions" description="Run this job to populate history." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-t border-neutral-100 bg-neutral-50/50 text-neutral-500">
                <tr>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Trigger</th>
                  <th className="px-4 py-2 text-left">Attempt</th>
                  <th className="px-4 py-2 text-left">Duration</th>
                  <th className="px-4 py-2 text-left">HTTP</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((ex) => (
                  <tr
                    key={ex.id}
                    className="cursor-pointer border-t border-neutral-50 hover:bg-neutral-50"
                    onClick={() => router.push(`/executions/${ex.id}`)}
                  >
                    <td className="px-4 py-3"><StatusBadge status={ex.status} /></td>
                    <td className="px-4 py-3">{ex.triggerType}</td>
                    <td className="px-4 py-3">{ex.attemptNumber}/{ex.maxAttempts}</td>
                    <td className="px-4 py-3">{ex.durationMs ? `${(ex.durationMs / 1000).toFixed(1)}s` : "—"}</td>
                    <td className="px-4 py-3">{ex.httpStatus ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function JobDetailPage() {
  return <AuthGuard><JobDetailContent /></AuthGuard>;
}
