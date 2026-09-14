import { ExecutionStatus, RiskLevel, RetryDecision } from "@prisma/client";
import { addExecutionEvent } from "./events.js";
import { isSideEffectingMethod } from "./job-config.js";
import { jobConfigurationSchema } from "./job-config.js";
import { assertTransition } from "./execution-state.js";
import { log } from "./logger.js";
import { prisma } from "./prisma.js";
import { UNKNOWN_RETRY_REASON } from "./retry.js";
import { loadConfig } from "./config.js";
import { enqueueExecution } from "./queue.js";

export async function recoverStaleExecutions(): Promise<number> {
  const { WORKER_LEASE_MS } = loadConfig();
  const cutoff = new Date(Date.now() - WORKER_LEASE_MS);
  const stale = await prisma.execution.findMany({
    where: {
      status: ExecutionStatus.RUNNING,
      OR: [{ heartbeatAt: { lt: cutoff } }, { heartbeatAt: null }],
    },
    include: { job: true },
    take: 20,
  });

  let recovered = 0;
  for (const ex of stale) {
    const config = jobConfigurationSchema.parse(ex.job.configuration);
    const conservative =
      ex.job.riskLevel === RiskLevel.HIGH && isSideEffectingMethod(config.method);

    try {
      if (conservative) {
        await prisma.$transaction(async (tx) => {
          const current = await tx.execution.findUnique({ where: { id: ex.id } });
          if (!current || current.status !== ExecutionStatus.RUNNING) return;
          assertTransition(current.status, ExecutionStatus.UNKNOWN);
          await tx.execution.update({
            where: { id: ex.id },
            data: {
              status: ExecutionStatus.UNKNOWN,
              finishedAt: new Date(),
              workerId: null,
              retryDecision: RetryDecision.BLOCKED,
              retryReason: UNKNOWN_RETRY_REASON,
              errorCode: "WORKER_STALE",
              errorMessage: "Worker stopped heartbeating; outcome uncertain",
            },
          });
        });
        await addExecutionEvent(ex.id, "Stale worker recovery → UNKNOWN");
      } else {
        await prisma.$transaction(async (tx) => {
          const current = await tx.execution.findUnique({ where: { id: ex.id } });
          if (!current || current.status !== ExecutionStatus.RUNNING) return;
          assertTransition(current.status, ExecutionStatus.QUEUED);
          await tx.execution.update({
            where: { id: ex.id },
            data: {
              status: ExecutionStatus.QUEUED,
              workerId: null,
              startedAt: null,
              heartbeatAt: null,
            },
          });
        });
        await addExecutionEvent(ex.id, "Stale worker recovery → re-queued");
        await enqueueExecution(ex.id);
      }
      log.info("StaleExecutionRecovered", {
        execution_id: ex.id,
        job_id: ex.jobId,
        outcome: conservative ? "UNKNOWN" : "QUEUED",
      });
      recovered++;
    } catch {
      // race with live worker
    }
  }
  return recovered;
}
