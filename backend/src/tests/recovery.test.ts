import { describe, it, expect, beforeEach } from "vitest";
import { integrationDbReady } from "./integration.js";
import { ExecutionStatus } from "@prisma/client";
import { recoverStaleExecutions } from "../lib/recovery.js";
import { createJob, createQueuedExecution, createUser, resetDb } from "./helpers.js";
import { prisma } from "../lib/prisma.js";

describe.skipIf(!integrationDbReady())("worker recovery", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("re-queues stale LOW risk GET execution", async () => {
    const user = await createUser();
    const job = await createJob(user.id, {
      riskLevel: "LOW",
      configuration: {
        method: "GET",
        url: "https://example.com",
        headers: {},
        timeoutMs: 5000,
      },
    });
    const execution = await createQueuedExecution(job.id);
    const staleHeartbeat = new Date(Date.now() - 120_000);

    await prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: ExecutionStatus.RUNNING,
        workerId: "worker-stale",
        startedAt: staleHeartbeat,
        heartbeatAt: staleHeartbeat,
      },
    });

    const recovered = await recoverStaleExecutions();
    expect(recovered).toBeGreaterThanOrEqual(1);

    const updated = await prisma.execution.findUniqueOrThrow({ where: { id: execution.id } });
    expect(updated.status).toBe(ExecutionStatus.QUEUED);
    expect(updated.workerId).toBeNull();
  });

  it("marks stale HIGH risk POST as UNKNOWN", async () => {
    const user = await createUser();
    const job = await createJob(user.id, {
      riskLevel: "HIGH",
      configuration: {
        method: "POST",
        url: "https://example.com",
        headers: {},
        timeoutMs: 5000,
      },
    });
    const execution = await createQueuedExecution(job.id);
    const staleHeartbeat = new Date(Date.now() - 120_000);

    await prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: ExecutionStatus.RUNNING,
        workerId: "worker-stale",
        startedAt: staleHeartbeat,
        heartbeatAt: staleHeartbeat,
      },
    });

    await recoverStaleExecutions();
    const updated = await prisma.execution.findUniqueOrThrow({ where: { id: execution.id } });
    expect(updated.status).toBe(ExecutionStatus.UNKNOWN);
    expect(updated.retryDecision).toBe("BLOCKED");
  });
});
