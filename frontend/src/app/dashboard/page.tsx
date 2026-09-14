"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { StatusBadge } from "@/components/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { api, Dashboard } from "@/lib/api";

function DashboardContent() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await api<Dashboard>("/api/dashboard");
    if (res.error) setError(res.error);
    else if (res.data) setData(res.data);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (!data && !error) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of jobs, executions, and items needing attention"
        action={
          <Link href="/jobs/new">
            <Button>New job</Button>
          </Link>
        }
      />
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {data && data.attentionCount > 0 && (
        <div className="mb-6">
          <Alert variant="warning" title="Attention required">
            {data.attentionCount} execution{data.attentionCount === 1 ? "" : "s"} with UNKNOWN
            outcomes may need verification before retry.
            <Link href="/executions?status=UNKNOWN" className="ml-2 font-medium underline">
              View
            </Link>
          </Alert>
        </div>
      )}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Total jobs", data.totalJobs],
              ["Active jobs", data.activeJobs],
              ["Running / queued", data.runningExecutions],
              ["Success rate", data.successRate !== null ? `${data.successRate}%` : "—"],
              ["Failed", data.failedExecutions],
              ["Unknown", data.unknownExecutions],
            ].map(([label, value]) => (
              <Card key={String(label)}>
                <CardBody>
                  <p className="text-sm text-neutral-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{value}</p>
                </CardBody>
              </Card>
            ))}
          </div>
          <Card className="mt-8 overflow-hidden">
            <CardHeader title="Recent executions" action={<Link href="/executions" className="text-sm text-emerald-700 hover:underline">View all</Link>} />
            {data.recentExecutions.length === 0 ? (
              <EmptyState
                title="No runs yet"
                description="Create a job and click Run now to see your first execution."
                actionLabel="Create job"
                actionHref="/jobs/new"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-t border-neutral-100 bg-neutral-50/50 text-neutral-500">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                      <th className="px-4 py-2 text-left font-medium">Execution</th>
                      <th className="px-4 py-2 text-left font-medium">Trigger</th>
                      <th className="px-4 py-2 text-left font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentExecutions.map((ex) => (
                      <tr key={ex.id} className="border-t border-neutral-50 hover:bg-neutral-50/50">
                        <td className="px-4 py-3"><StatusBadge status={ex.status} /></td>
                        <td className="px-4 py-3">
                          <Link href={`/executions/${ex.id}`} className="font-medium hover:underline">
                            {ex.id.slice(0, 8)}…
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{ex.triggerType}</td>
                        <td className="px-4 py-3 text-neutral-600">{new Date(ex.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
