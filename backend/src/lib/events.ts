import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function addExecutionEvent(
  executionId: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.executionEvent.create({
    data: {
      executionId,
      message,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}
