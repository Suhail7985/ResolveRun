import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export type ClaimedExecution = {
  id: string;
  jobId: string;
  attemptNumber: number;
  maxAttempts: number;
};

/**
 * Atomically claim one QUEUED execution (or one due for retry).
 * Uses FOR UPDATE SKIP LOCKED so competing workers cannot claim the same row.
 */
export async function claimNextExecution(workerId: string): Promise<ClaimedExecution | null> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT e.id
      FROM executions e
      WHERE e.status = 'QUEUED'
      ORDER BY e.created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;

    if (rows.length === 0) return null;

    const executionId = rows[0].id;
    const updated = await tx.execution.updateMany({
      where: {
        id: executionId,
        status: "QUEUED",
      },
      data: {
        status: "RUNNING",
        workerId,
        startedAt: now,
        heartbeatAt: now,
      },
    });

    if (updated.count !== 1) return null;

    const execution = await tx.execution.findUniqueOrThrow({
      where: { id: executionId },
      select: {
        id: true,
        jobId: true,
        attemptNumber: true,
        maxAttempts: true,
      },
    });

    return execution;
  });
}

export async function claimExecutionById(
  executionId: string,
  workerId: string
): Promise<boolean> {
  const now = new Date();
  const result = await prisma.execution.updateMany({
    where: { id: executionId, status: "QUEUED" },
    data: {
      status: "RUNNING",
      workerId,
      startedAt: now,
      heartbeatAt: now,
    },
  });
  return result.count === 1;
}

export async function touchHeartbeat(executionId: string, workerId: string): Promise<void> {
  await prisma.execution.updateMany({
    where: { id: executionId, status: "RUNNING", workerId },
    data: { heartbeatAt: new Date() },
  });
}
