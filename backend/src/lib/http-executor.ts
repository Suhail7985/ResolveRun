import { fetch, Agent } from "undici";
import { JobConfiguration } from "./job-config.js";
import { validateOutboundUrl } from "./ssrf.js";

const agent = new Agent({
  connect: { timeout: 30_000 },
});

export type HttpResult =
  | { ok: true; status: number; summary: string }
  | { ok: false; status: number | null; errorCode: string; errorMessage: string; timedOut: boolean };

export async function executeHttpJob(config: JobConfiguration): Promise<HttpResult> {
  await validateOutboundUrl(config.url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const start = Date.now();

  try {
    const headers: Record<string, string> = { ...config.headers };
    const hasBody = config.body && config.method !== "GET";
    if (hasBody && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(config.url, {
      method: config.method,
      headers,
      body: hasBody ? config.body : undefined,
      signal: controller.signal,
      dispatcher: agent,
    });

    const raw = await response.text();
    const summary = `HTTP ${response.status} in ${Date.now() - start}ms (${raw.length} bytes)`;
    if (response.ok) {
      return { ok: true, status: response.status, summary };
    }
    return {
      ok: false,
      status: response.status,
      errorCode: "HTTP_ERROR",
      errorMessage: `HTTP ${response.status}`,
      timedOut: false,
    };
  } catch (err) {
    const timedOut =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"));
    return {
      ok: false,
      status: null,
      errorCode: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
      errorMessage: err instanceof Error ? err.message : "Request failed",
      timedOut,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function executeVerification(
  verification: NonNullable<JobConfiguration["verification"]>
): Promise<HttpResult> {
  return executeHttpJob({
    method: verification.method,
    url: verification.url,
    headers: {},
    timeoutMs: 15000,
  });
}
