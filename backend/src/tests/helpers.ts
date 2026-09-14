import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/auth.js";

export async function resetDb() {
  await prisma.executionEvent.deleteMany();
  await prisma.execution.deleteMany();
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(email = "a@test.com") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("password123"),
    },
  });
}

export async function createJob(userId: string, overrides: Record<string, unknown> = {}) {
  return prisma.job.create({
    data: {
      userId,
      name: "Test Job",
      configuration: {
        method: "GET",
        url: "https://example.com",
        headers: {},
        timeoutMs: 5000,
      },
      riskLevel: "LOW",
      enabled: true,
      ...overrides,
    },
  });
}

export async function createQueuedExecution(jobId: string) {
  return prisma.execution.create({
    data: {
      jobId,
      status: "QUEUED",
      triggerType: "MANUAL",
      maxAttempts: 3,
    },
  });
}
