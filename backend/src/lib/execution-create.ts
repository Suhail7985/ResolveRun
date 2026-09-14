import { Prisma, TriggerType } from "@prisma/client";
import { addExecutionEvent } from "./events.js";
import { enqueueExecution } from "./queue.js";
import { prisma } from "./prisma.js";

export type CreateExecutionInput = {
  jobId: string;
  triggerType: TriggerType;
  idempotencyKey?: string | null;
  scheduleOccurrenceKey?: string | null;
  maxAttempts?: number;
};

export async function createAndQueueExecution(input: CreateExecutionInput) {
  const job = await prisma.job.findFirst({
    where: { id: input.jobId, deletedAt: null },
  });
  if (!job) {
    throw new Error("Job not found or deleted");
  }

  const execution = await prisma.execution.create({
    data: {
      jobId: input.jobId,
      status: "QUEUED",
      triggerType: input.triggerType,
      idempotencyKey: input.idempotencyKey ?? null,
      scheduleOccurrenceKey: input.scheduleOccurrenceKey ?? null,
      maxAttempts: input.maxAttempts ?? 3,
      configurationSnapshot: job.configuration as Prisma.InputJsonValue,
    },
  });

  await addExecutionEvent(execution.id, "Execution queued");
  await enqueueExecution(execution.id);
  return execution;
}
