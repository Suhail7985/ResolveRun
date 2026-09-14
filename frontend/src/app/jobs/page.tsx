"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { api, Job } from "@/lib/api";

function JobsContent() {
  const [items, setItems] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await api<{ items: Job[] }>(`/api/jobs${q}`);
    if (res.error) setError(res.error);
    else if (res.data) setItems(res.data.items);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function toggle(job: Job) {
    setMessage("");
    const path = job.enabled ? "disable" : "enable";
    const res = await api(`/api/jobs/${job.id}/${path}`, { method: "POST" });
    if (res.error) setError(res.error);
    else {
      setMessage(job.enabled ? "Job disabled" : "Job enabled");
      await load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this job? Execution history remains in the database but the job will be hidden.")) return;
    setMessage("");
    const res = await api(`/api/jobs/${id}`, { method: "DELETE" });
    if (res.error) setError(res.error);
    else {
      setMessage("Job deleted");
      await load();
    }
  }

  async function runNow(id: string) {
    setMessage("");
    const res = await api(`/api/jobs/${id}/run`, {
      method: "POST",
      headers: { "Idempotency-Key": `run-${id}-${Date.now()}` },
    });
    if (res.error) setError(res.error);
    else setMessage("Run queued — check Executions");
  }

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        title="Jobs"
        description="HTTP jobs with schedules and risk-aware execution"
        action={<Link href="/jobs/new"><Button>New job</Button></Link>}
      />
      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
      {message && <div className="mb-4"><Alert variant="success">{message}</Alert></div>}
      <Input
        placeholder="Search jobs…"
        className="mb-4 max-w-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            title="No jobs"
            description="Create your first HTTP job to start scheduling and running work."
            actionLabel="Create job"
            actionHref="/jobs/new"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50/80 text-neutral-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Risk</th>
                  <th className="px-4 py-3 text-left font-medium">Schedule</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Last run</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((job) => (
                  <tr key={job.id} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${job.id}`} className="font-medium text-neutral-900 hover:underline">
                        {job.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{job.riskLevel}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600">{job.schedule ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={job.enabled ? "text-emerald-700" : "text-neutral-400"}>
                        {job.enabled ? "Enabled" : "Disabled"}
                      </span>
                      {job.lastExecutionStatus && (
                        <div className="mt-1"><StatusBadge status={job.lastExecutionStatus} /></div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => runNow(job.id)}>Run</Button>
                        <Link href={`/jobs/${job.id}/edit`}><Button variant="ghost" className="!px-2 !py-1 text-xs">Edit</Button></Link>
                        <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => toggle(job)}>{job.enabled ? "Off" : "On"}</Button>
                        <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => remove(job.id)}>Del</Button>
                      </div>
                    </td>
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

export default function JobsPage() {
  return <AuthGuard><JobsContent /></AuthGuard>;
}
