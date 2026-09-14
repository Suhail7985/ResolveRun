"use client";

import { useState } from "react";
import { Job } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

import { DEMO_API_BASE, DEMO_SUCCESS_URL } from "@/lib/demo-urls";

type Props = {
  initial?: Partial<Job>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  submitLabel: string;
};

export function JobForm({ initial, onSubmit, submitLabel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [method, setMethod] = useState(initial?.configuration?.method ?? "GET");
  const [url, setUrl] = useState(initial?.configuration?.url ?? DEMO_SUCCESS_URL);
  const [body, setBody] = useState(initial?.configuration?.body ?? "");
  const [timeoutMs, setTimeoutMs] = useState(initial?.configuration?.timeoutMs ?? 10000);
  const [schedule, setSchedule] = useState(initial?.schedule ?? "");
  const [riskLevel, setRiskLevel] = useState<"LOW" | "MEDIUM" | "HIGH">(
    initial?.riskLevel ?? "MEDIUM"
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [verifyUrl, setVerifyUrl] = useState(initial?.configuration?.verification?.url ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const configuration: Record<string, unknown> = {
      method,
      url,
      headers: initial?.configuration?.headers ?? {},
      timeoutMs,
    };
    if (body && method !== "GET") configuration.body = body;
    if (verifyUrl) {
      configuration.verification = { method: "GET", url: verifyUrl, expectStatus: 200 };
    }
    try {
      await onSubmit({
        name,
        description: description || undefined,
        schedule: schedule || null,
        enabled,
        riskLevel,
        configuration,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <Label htmlFor="name">Job name</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="desc">Description</Label>
        <Textarea id="desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="method">HTTP method</Label>
          <Select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="risk">Risk level</Label>
          <Select id="risk" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as "LOW" | "MEDIUM" | "HIGH")}>
            <option value="LOW">LOW — safe retries</option>
            <option value="MEDIUM">MEDIUM — careful retries</option>
            <option value="HIGH">HIGH — UNKNOWN on ambiguity</option>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="url">URL</Label>
        <Input id="url" required type="url" className="font-mono text-xs" value={url} onChange={(e) => setUrl(e.target.value)} />
        <p className="mt-2 text-xs text-neutral-500">
          Demo: {DEMO_SUCCESS_URL} · flaky GET {DEMO_API_BASE}/api/demo/flaky/key · HIGH POST {DEMO_API_BASE}/api/demo/payment
        </p>
      </div>
      {method !== "GET" && (
        <div>
          <Label htmlFor="body">Request body</Label>
          <Textarea id="body" className="font-mono text-xs" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="timeout">Timeout (ms)</Label>
          <Input id="timeout" type="number" value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="cron">Cron schedule (UTC)</Label>
          <Input id="cron" placeholder="0 * * * *" className="font-mono text-xs" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="verify">Verification URL (optional)</Label>
        <Input id="verify" type="url" className="font-mono text-xs" value={verifyUrl} onChange={(e) => setVerifyUrl(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="rounded" />
        Enabled
      </label>
      {error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" disabled={loading}>{loading ? "Saving…" : submitLabel}</Button>
    </form>
  );
}
