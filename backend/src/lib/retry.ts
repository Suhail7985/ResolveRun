import { RiskLevel } from "@prisma/client";
import { isSideEffectingMethod } from "./job-config.js";

const RETRYABLE_HTTP = new Set([408, 429, 500, 502, 503, 504]);

export function backoffMs(attemptNumber: number): number {
  const steps = [10_000, 30_000, 90_000];
  return steps[Math.min(attemptNumber - 1, steps.length - 1)];
}

export function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_HTTP.has(status);
}

export type OutcomeKind = "success" | "failed" | "unknown";

export function classifyHttpResult(
  status: number,
  riskLevel: RiskLevel,
  method: string
): OutcomeKind {
  if (status >= 200 && status < 300) return "success";
  if (status >= 400 && status < 500 && !isRetryableHttpStatus(status)) {
    return "failed";
  }
  if (isRetryableHttpStatus(status)) {
    if (riskLevel === "HIGH" && isSideEffectingMethod(method)) {
      return "unknown";
    }
    return "failed";
  }
  return "failed";
}

export function classifyNetworkError(
  riskLevel: RiskLevel,
  method: string,
  timedOut: boolean
): OutcomeKind {
  if (timedOut && riskLevel === "HIGH" && isSideEffectingMethod(method)) {
    return "unknown";
  }
  if (timedOut && isSideEffectingMethod(method) && riskLevel === "MEDIUM") {
    return "unknown";
  }
  return "failed";
}

export const UNKNOWN_RETRY_REASON =
  "This operation may have completed successfully even though the network response was lost. Automatically retrying could create a duplicate side effect.";

export function shouldAutoRetry(
  outcome: OutcomeKind,
  riskLevel: RiskLevel,
  method: string,
  httpStatus: number | null,
  attemptNumber: number,
  maxAttempts: number
): { retry: boolean; decision: "NONE" | "SCHEDULED" | "BLOCKED"; reason?: string } {
  if (outcome === "success") {
    return { retry: false, decision: "NONE" };
  }
  if (outcome === "unknown") {
    return { retry: false, decision: "BLOCKED", reason: UNKNOWN_RETRY_REASON };
  }
  if (attemptNumber >= maxAttempts) {
    return {
      retry: false,
      decision: "NONE",
      reason: "Maximum retry attempts reached",
    };
  }
  if (httpStatus !== null && !isRetryableHttpStatus(httpStatus)) {
    return {
      retry: false,
      decision: "NONE",
      reason: `HTTP ${httpStatus} is not considered transient`,
    };
  }
  if (riskLevel === "HIGH" && isSideEffectingMethod(method) && httpStatus === null) {
    return { retry: false, decision: "BLOCKED", reason: UNKNOWN_RETRY_REASON };
  }
  return { retry: true, decision: "SCHEDULED" };
}
