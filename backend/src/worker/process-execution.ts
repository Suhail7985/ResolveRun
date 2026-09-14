import {
  ExecutionStatus,
  RetryDecision,
  RiskLevel,
  TriggerType,
} from "@prisma/client";
import { addExecutionEvent } from "../lib/events.js";
import { executeHttpJob, executeVerification } from "../lib/http-executor.js";
import { jobConfigurationSchema, JobConfiguration } from "../lib/job-config.js";
import { log } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import {
  backoffMs,
  classifyHttpResult,
  classifyNetworkError,
  shouldAutoRetry,
  UNKNOWN_RETRY_REASON,
} from "../lib/retry.js";
import { assertTransition } from "../lib/execution-state.js";
import { touchHeartbeat } from "../lib/claim.js";
import { enqueueExecution } from "../lib/queue.js";

export async function processExecution(
  executionId: string,
  workerId: string,
  heartbeatEveryMs: number
): Promise<void> {
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    include: { job: true },
  });
  if (!execution || execution.status !== "RUNNING" || execution.workerId !== workerId) {
    return;
  }

  const config = jobConfigurationSchema.parse(
    execution.configurationSnapshot ?? execution.job.configuration
  );
  const riskLevel = execution.job.riskLevel;

  await addExecutionEvent(executionId, "Request started", {
    workerId,
    method: config.method,
    url: config.url,
  });

  log.info("ExternalRequestStarted", {
    execution_id: executionId,
    job_id: execution.jobId,
    worker_id: workerId,
    attempt_number: execution.attemptNumber,
  });

  const heartbeatTimer = setInterval(() => {
    void touchHeartbeat(executionId, workerId);
  }, heartbeatEveryMs);

  const start = Date.now();
  let result;
  try {
    result = await executeHttpJob(config);
  } finally {
    clearInterval(heartbeatTimer);
  }
  const durationMs = Date.now() - start;

  if (result.ok) {
    await finishSuccess(executionId, execution.jobId, result.status, durationMs, result.summary);
    return;
  }

  if (result.status !== null) {
    const kind = classifyHttpResult(result.status, riskLevel, config.method);
    if (kind === "unknown") {
      await finishUnknown(
        executionId,
        execution.jobId,
        result.status,
        durationMs,
        "Ambiguous HTTP response for side-effecting operation"
      );
      return;
    }
    await finishFailureOrRetry(
      execution,
      config,
      riskLevel,
      result.status,
      durationMs,
      result.errorCode,
      result.errorMessage,
      null
    );
    return;
  }

  if (result.timedOut) {
    await addExecutionEvent(executionId, "Network timeout", { workerId });
    log.info("ExternalRequestTimedOut", {
      execution_id: executionId,
      job_id: execution.jobId,
      worker_id: workerId,
    });
  }

  const kind = classifyNetworkError(riskLevel, config.method, result.timedOut);
  if (kind === "unknown") {
    await finishUnknown(
      executionId,
      execution.jobId,
      result.status,
      durationMs,
      result.errorMessage
    );
    return;
  }

  await finishFailureOrRetry(
    execution,
    config,
    riskLevel,
    result.status,
    durationMs,
    result.errorCode,
    result.errorMessage,
    null
  );
}

async function finishSuccess(
  executionId: string,
  jobId: string,
  httpStatus: number,
  durationMs: number,
  summary: string
): Promise<void> {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const current = await tx.execution.findUniqueOrThrow({ where: { id: executionId } });
    assertTransition(current.status, ExecutionStatus.SUCCEEDED);
    await tx.execution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.SUCCEEDED,
        finishedAt: now,
        durationMs,
        httpStatus,
        resultSummary: summary,
        retryDecision: RetryDecision.NONE,
      },
    });
    await tx.job.update({
      where: { id: jobId },
      data: { lastRunAt: now },
    });
  });
  await addExecutionEvent(executionId, "Execution succeeded", { httpStatus });
  log.info("ExecutionSucceeded", { execution_id: executionId, job_id: jobId });
}

async function finishUnknown(
  executionId: string,
  jobId: string,
  httpStatus: number | null,
  durationMs: number,
  errorMessage: string
): Promise<void> {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const current = await tx.execution.findUniqueOrThrow({ where: { id: executionId } });
    assertTransition(current.status, ExecutionStatus.UNKNOWN);
    await tx.execution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.UNKNOWN,
        finishedAt: now,
        durationMs,
        httpStatus,
        errorMessage,
        retryDecision: RetryDecision.BLOCKED,
        retryReason: UNKNOWN_RETRY_REASON,
      },
    });
    await tx.job.update({
      where: { id: jobId },
      data: { lastRunAt: now },
    });
  });
  await addExecutionEvent(executionId, "Outcome classified as UNKNOWN");
  await addExecutionEvent(executionId, "Automatic retry blocked", {
    reason: UNKNOWN_RETRY_REASON,
  });
  log.info("ExecutionMarkedUnknown", { execution_id: executionId, job_id: jobId });
}

async function finishFailureOrRetry(
  execution: {
    id: string;
    jobId: string;
    attemptNumber: number;
    maxAttempts: number;
    status: ExecutionStatus;
  },
  config: JobConfiguration,
  riskLevel: RiskLevel,
  httpStatus: number | null,
  durationMs: number,
  errorCode: string,
  errorMessage: string,
  resultSummary: string | null
): Promise<void> {
  const outcome = "failed" as const;
  const decision = shouldAutoRetry(
    outcome,
    riskLevel,
    config.method,
    httpStatus,
    execution.attemptNumber,
    execution.maxAttempts
  );

  const now = new Date();

  if (decision.retry) {
    const retryAt = new Date(now.getTime() + backoffMs(execution.attemptNumber));
    await prisma.$transaction(async (tx) => {
      const current = await tx.execution.findUniqueOrThrow({ where: { id: execution.id } });
      assertTransition(current.status, ExecutionStatus.FAILED);
      await tx.execution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          finishedAt: now,
          durationMs,
          httpStatus,
          errorCode,
          errorMessage,
          resultSummary,
        },
      });
      assertTransition(ExecutionStatus.FAILED, ExecutionStatus.RETRYING);
      await tx.execution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.RETRYING,
          attemptNumber: execution.attemptNumber + 1,
          triggerType: TriggerType.RETRY,
          retryDecision: RetryDecision.SCHEDULED,
          retryReason: `Retry scheduled in ${backoffMs(execution.attemptNumber) / 1000}s`,
          scheduledRetryAt: retryAt,
          workerId: null,
          startedAt: null,
          heartbeatAt: null,
        },
      });
    });
    await addExecutionEvent(execution.id, "Retry scheduled", { retryAt: retryAt.toISOString() });
    log.info("RetryScheduled", { execution_id: execution.id, job_id: execution.jobId });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.execution.findUniqueOrThrow({ where: { id: execution.id } });
    assertTransition(current.status, ExecutionStatus.FAILED);
    await tx.execution.update({
      where: { id: execution.id },
      data: {
        status: ExecutionStatus.FAILED,
        finishedAt: now,
        durationMs,
        httpStatus,
        errorCode,
        errorMessage,
        resultSummary,
        retryDecision: decision.decision,
        retryReason: decision.reason ?? null,
      },
    });
    await tx.job.update({
      where: { id: execution.jobId },
      data: { lastRunAt: now },
    });
  });
  await addExecutionEvent(execution.id, "Execution failed", { errorCode, errorMessage });
}

export async function runVerification(executionId: string): Promise<void> {
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    include: { job: true },
  });
  if (!execution || execution.status !== ExecutionStatus.UNKNOWN) {
    throw new Error("Execution is not in UNKNOWN state");
  }

  const config = jobConfigurationSchema.parse(
    execution.configurationSnapshot ?? execution.job.configuration
  );
  if (!config.verification) {
    throw new Error("Job has no verification configuration");
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.execution.findUniqueOrThrow({ where: { id: executionId } });
    assertTransition(current.status, ExecutionStatus.VERIFYING);
    await tx.execution.update({
      where: { id: executionId },
      data: { status: ExecutionStatus.VERIFYING },
    });
  });
  await addExecutionEvent(executionId, "Verification started");

  const result = await executeVerification(config.verification);

  if (result.ok && result.status === config.verification.expectStatus) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.execution.findUniqueOrThrow({ where: { id: executionId } });
      assertTransition(current.status, ExecutionStatus.SUCCEEDED);
      await tx.execution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.SUCCEEDED,
          finishedAt: new Date(),
          httpStatus: result.status,
          resultSummary: "Verified: original operation likely succeeded",
          retryDecision: RetryDecision.NONE,
          retryReason: null,
        },
      });
    });
    await addExecutionEvent(executionId, "Verification confirmed success");
    return;
  }

  if (result.ok && result.status === 404) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.execution.findUniqueOrThrow({ where: { id: executionId } });
      assertTransition(current.status, ExecutionStatus.QUEUED);
      await tx.execution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.QUEUED,
          workerId: null,
          startedAt: null,
          heartbeatAt: null,
          finishedAt: null,
          retryDecision: RetryDecision.MANUAL_ONLY,
          retryReason: "Verification indicates resource not found; safe to retry manually",
        },
      });
    });
    await addExecutionEvent(executionId, "Verification: not found — safe to retry");
    await enqueueExecution(executionId);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.execution.findUniqueOrThrow({ where: { id: executionId } });
    assertTransition(current.status, ExecutionStatus.UNKNOWN);
    await tx.execution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.UNKNOWN,
        retryReason: "Verification inconclusive; manual review required",
      },
    });
  });
  await addExecutionEvent(executionId, "Verification still inconclusive");
}
