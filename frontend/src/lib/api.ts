export type ApiError = { error: string | { code: string; message: string } };

async function parseJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const res = await fetch(path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
    const body = await parseJson<T | ApiError>(res);
    if (!res.ok) {
      const err = (body ?? {}) as ApiError;
      const message =
        typeof err.error === "string"
          ? err.error
          : err.error?.message ?? res.statusText;
      return { error: message, status: res.status };
    }
    if (body === null) {
      return { error: "Invalid response from server", status: res.status };
    }
    return { data: body as T, status: res.status };
  } catch {
    return { error: "Could not reach the API. Is the backend running on port 4000?", status: 0 };
  }
}

export type User = { id: string; email: string };

export type Job = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  configuration: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    verification?: { method: string; url: string; expectStatus: number };
  };
  schedule?: string | null;
  scheduleDescription?: string | null;
  enabled: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  lastExecutionStatus?: string | null;
  successRate?: number | null;
};

export type Execution = {
  id: string;
  jobId: string;
  status: string;
  triggerType: string;
  attemptNumber: number;
  maxAttempts: number;
  workerId?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  httpStatus?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  resultSummary?: string | null;
  retryDecision?: string | null;
  retryReason?: string | null;
  createdAt: string;
};

export type ExecutionDetail = Execution & {
  jobName: string;
  riskLevel: string;
  timeline: { at: string; message: string; metadata?: unknown }[];
};

export type ExecutionListItem = Execution & { jobName?: string };

export type Dashboard = {
  totalJobs: number;
  activeJobs: number;
  runningExecutions: number;
  successRate: number | null;
  failedExecutions: number;
  unknownExecutions: number;
  attentionCount: number;
  recentExecutions: Execution[];
};

export function maskHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (/authorization|api-key|token|secret/i.test(k) || v.startsWith("Bearer ")) {
      out[k] = v.startsWith("Bearer ") ? "Bearer ••••••••" : "••••••••";
    } else {
      out[k] = v;
    }
  }
  return out;
}
