import { ExecutionStatus } from "@prisma/client";
import { assertTransition } from "./execution-state.js";
import { enqueueRetryExecution } from "./queue.js";
import { prisma } from "./prisma.js";

/** Move due RETRYING executions to QUEUED (state machine: RETRYING → QUEUED). */
export async function promoteDueRetries(): Promise<number> {
  const now = new Date();
  const due = await prisma.execution.findMany({
    where: {
      status: ExecutionStatus.RETRYING,
      scheduledRetryAt: { lte: now },
    },
    select: { id: true },
    take: 50,
  });

  let count = 0;
  for (const row of due) {
    try {
      await prisma.$transaction(async (tx) => {
        const current = await tx.execution.findUnique({ where: { id: row.id } });
        if (!current || current.status !== ExecutionStatus.RETRYING) return;
        assertTransition(current.status, ExecutionStatus.QUEUED);
        await tx.execution.update({
          where: { id: row.id },
          data: {
            status: ExecutionStatus.QUEUED,
            workerId: null,
            scheduledRetryAt: null,
          },
        });
      });
      await enqueueRetryExecution(row.id);
      count++;
    } catch {
      // concurrent update
    }
  }
  return count;
}
