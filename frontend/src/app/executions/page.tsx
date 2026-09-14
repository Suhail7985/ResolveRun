"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { api, Execution } from "@/lib/api";

type ExecutionRow = Execution & { jobName?: string };

function ExecutionsContentInner() {
  const [items, setItems] = useState<ExecutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") ?? "");

  const load = useCallback(async () => {
    setError("");
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await api<{ items: ExecutionRow[] }>(`/api/executions${q}`);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    if (res.data) setItems(res.data.items);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    setLoading(true);
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        title="Executions"
        description="Full history across all jobs — live status from the API"
      />
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "UNKNOWN", "VERIFYING"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            title="No executions yet"
            description="Run a job from the Jobs page to see execution history here."
            actionLabel="View jobs"
            actionHref="/jobs"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50/80 text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Trigger</th>
                  <th className="px-4 py-3 font-medium">Attempt</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {items.map((ex) => (
                  <tr key={ex.id} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                    <td className="px-4 py-3">
                      <StatusBadge status={ex.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/executions/${ex.id}`} className="font-medium text-neutral-900 hover:underline">
                        {ex.jobName ?? ex.jobId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{ex.triggerType}</td>
                    <td className="px-4 py-3 text-neutral-600">{ex.attemptNumber}/{ex.maxAttempts}</td>
                    <td className="px-4 py-3 text-neutral-600">{new Date(ex.createdAt).toLocaleString()}</td>
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

function ExecutionsContent() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExecutionsContentInner />
    </Suspense>
  );
}

export default function ExecutionsPage() {
  return (
    <AuthGuard>
      <ExecutionsContent />
    </AuthGuard>
  );
}
