import { Execution, Job } from "@prisma/client";

export function toJobDto(job: Job) {
  return {
    id: job.id,
    name: job.name,
    description: job.description,
    type: job.type,
    configuration: job.configuration,
    schedule: job.schedule,
    enabled: job.enabled,
    riskLevel: job.riskLevel,
    nextRunAt: job.nextRunAt,
    lastRunAt: job.lastRunAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export function toExecutionDto(execution: Execution) {
  return {
    id: execution.id,
    jobId: execution.jobId,
    status: execution.status,
    triggerType: execution.triggerType,
    attemptNumber: execution.attemptNumber,
    maxAttempts: execution.maxAttempts,
    workerId: execution.workerId,
    startedAt: execution.startedAt,
    finishedAt: execution.finishedAt,
    heartbeatAt: execution.heartbeatAt,
    durationMs: execution.durationMs,
    httpStatus: execution.httpStatus,
    errorCode: execution.errorCode,
    errorMessage: execution.errorMessage,
    resultSummary: execution.resultSummary,
    retryDecision: execution.retryDecision,
    retryReason: execution.retryReason,
    createdAt: execution.createdAt,
    updatedAt: execution.updatedAt,
  };
}
