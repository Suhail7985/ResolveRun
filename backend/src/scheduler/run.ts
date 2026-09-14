import { Prisma, TriggerType } from "@prisma/client";
import { scheduleOccurrenceKey, getNextRun } from "../lib/cron.js";
import { enqueueExecution } from "../lib/queue.js";
import { log } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

export async function runSchedulerTick(): Promise<number> {
  const now = new Date();
  const dueJobs = await prisma.job.findMany({
    where: {
      deletedAt: null,
      enabled: true,
      schedule: { not: null },
      nextRunAt: { lte: now },
    },
    take: 20,
  });

  let created = 0;
  for (const job of dueJobs) {
    if (!job.schedule || !job.nextRunAt) continue;
    const occurrenceKey = scheduleOccurrenceKey(job.id, job.nextRunAt);

    try {
      let newExecutionId: string | null = null;
      await prisma.$transaction(async (tx) => {
        const locked = await tx.job.findFirst({
          where: { id: job.id, enabled: true, nextRunAt: { lte: now } },
        });
        if (!locked) return;

        try {
          const jobRow = await tx.job.findUniqueOrThrow({ where: { id: job.id } });
          const execution = await tx.execution.create({
            data: {
              jobId: job.id,
              status: "QUEUED",
              triggerType: TriggerType.SCHEDULED,
              scheduleOccurrenceKey: occurrenceKey,
              maxAttempts: 3,
              configurationSnapshot: jobRow.configuration as Prisma.InputJsonValue,
            },
          });
          await tx.executionEvent.create({
            data: {
              executionId: execution.id,
              message: "Scheduled execution created",
            },
          });
          newExecutionId = execution.id;
        } catch (e: unknown) {
          const code =
            e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
          if (code !== "P2002") throw e;
        }

        const next = getNextRun(job.schedule!, now);
        await tx.job.update({
          where: { id: job.id },
          data: { nextRunAt: next },
        });
      });

      if (newExecutionId) {
        await enqueueExecution(newExecutionId);
        created++;
      }
    } catch (err) {
      log.warn("SchedulerJobFailed", { job_id: job.id, error: String(err) });
    }
  }

  if (created > 0) {
    log.info("SchedulerTick", { executions_created: created });
  }
  return created;
}
