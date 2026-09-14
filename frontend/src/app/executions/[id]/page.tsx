"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { StatusBadge } from "@/components/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { api, ExecutionDetail } from "@/lib/api";

const POLL_STATUSES = new Set(["QUEUED", "RUNNING", "VERIFYING", "RETRYING"]);

function ExecutionDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [ex, setEx] = useState<ExecutionDetail | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionOk, setActionOk] = useState("");

  const load = useCallback(async () => {
    const res = await api<ExecutionDetail>(`/api/executions/${id}`);
    if (res.data) setEx(res.data);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const pollStatus = ex?.status;
  useEffect(() => {
    if (!pollStatus || !POLL_STATUSES.has(pollStatus)) return;
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [pollStatus, load]);

  async function verify() {
    setActionError("");
    setActionOk("");
    const res = await api(`/api/executions/${id}/verify`, { method: "POST" });
    if (res.error) setActionError(res.error);
    else setActionOk("Verification queued");
    await load();
  }

  async function retry(force = false) {
    setActionError("");
    setActionOk("");
    const res = await api(`/api/executions/${id}/retry`, {
      method: "POST",
      body: JSON.stringify({ force }),
    });
    if (res.error) setActionError(res.error);
    else setActionOk("Retry queued");
    await load();
  }

  if (!ex) return <PageSkeleton />;

  return (
    <div>
      <p className="mb-4 text-sm text-neutral-500">
        <Link href={`/jobs/${ex.jobId}`} className="hover:underline">← {ex.jobName}</Link>
        {" · "}
        <Link href="/executions" className="hover:underline">All executions</Link>
      </p>
      <PageHeader title="Execution details" description={ex.id} />
      {ex.status === "UNKNOWN" && (
        <Alert variant="warning" title="Unknown outcome">
          The request may have succeeded on the remote side. Automatic retry is blocked to prevent duplicate side effects.
          {ex.retryReason && <p className="mt-2">{ex.retryReason}</p>}
        </Alert>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Summary" />
          <CardBody className="space-y-2 text-sm">
            <p className="flex items-center gap-2"><span className="text-neutral-500">Status</span> <StatusBadge status={ex.status} /></p>
            <p><span className="text-neutral-500">Job</span> {ex.jobName}</p>
            <p><span className="text-neutral-500">Risk</span> {ex.riskLevel}</p>
            <p><span className="text-neutral-500">Trigger</span> {ex.triggerType}</p>
            <p><span className="text-neutral-500">Attempt</span> {ex.attemptNumber} / {ex.maxAttempts}</p>
            <p><span className="text-neutral-500">Worker</span> {ex.workerId ?? "—"}</p>
            <p><span className="text-neutral-500">Duration</span> {ex.durationMs ? `${(ex.durationMs / 1000).toFixed(1)}s` : "—"}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Result" />
          <CardBody className="space-y-2 text-sm">
            {ex.httpStatus != null && <p>HTTP {ex.httpStatus}</p>}
            {ex.errorCode && <p className="text-neutral-600">Code: {ex.errorCode}</p>}
            {ex.errorMessage && <p className="text-red-700">{ex.errorMessage}</p>}
            {ex.resultSummary && <p className="text-neutral-600">{ex.resultSummary}</p>}
          </CardBody>
        </Card>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {ex.status === "UNKNOWN" && (
          <>
            <Button onClick={verify}>Verify outcome</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("Retry anyway? This may duplicate a side effect.")) void retry(true);
              }}
            >
              Retry anyway
            </Button>
          </>
        )}
        {ex.status === "FAILED" && <Button onClick={() => retry(false)}>Retry</Button>}
      </div>
      {actionError && <div className="mt-4"><Alert variant="error">{actionError}</Alert></div>}
      {actionOk && <div className="mt-4"><Alert variant="success">{actionOk}</Alert></div>}
      <Card className="mt-8">
        <CardHeader title="Timeline" />
        <CardBody>
          <ol className="space-y-3 border-l-2 border-neutral-200 pl-4">
            {ex.timeline.map((ev) => (
              <li key={`${ev.at}-${ev.message}`} className="text-sm">
                <span className="font-mono text-xs text-neutral-400">{new Date(ev.at).toLocaleString()}</span>
                <span className="ml-2 text-neutral-800">{ev.message}</span>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
    </div>
  );
}

export default function ExecutionDetailPage() {
  return <AuthGuard><ExecutionDetailContent /></AuthGuard>;
}
