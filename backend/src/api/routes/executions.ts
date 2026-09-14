import { ExecutionStatus } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import { prisma } from "../../lib/prisma.js";
import { toExecutionDto } from "../mappers.js";
import { assertTransition } from "../../lib/execution-state.js";
import { addExecutionEvent } from "../../lib/events.js";
import { enqueueExecution, enqueueVerification } from "../../lib/queue.js";
import { activeJobWhere } from "../../lib/job-scope.js";
import { z } from "zod";

export async function registerExecutionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/api/executions")) return;
    await requireAuth(request, reply);
  });

  async function getOwnedExecution(executionId: string, userId: string) {
    return prisma.execution.findFirst({
      where: { id: executionId, job: { userId } },
      include: {
        job: true,
        events: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  app.get("/api/executions", async (request) => {
    const user = request.user!;
    const query = z
      .object({
        status: z.string().optional(),
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().default(20),
      })
      .parse(request.query);

    const jobIds = (
      await prisma.job.findMany({
        where: activeJobWhere({ userId: user.id }),
        select: { id: true },
      })
    ).map((j) => j.id);

    if (jobIds.length === 0) {
      return { items: [], total: 0, page: query.page, pageSize: query.pageSize };
    }

    const where = {
      jobId: { in: jobIds },
      ...(query.status ? { status: query.status as ExecutionStatus } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.execution.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { job: { select: { name: true } } },
      }),
      prisma.execution.count({ where }),
    ]);

    return {
      items: rows.map((e) => ({
        ...toExecutionDto(e),
        jobName: e.job.name,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  });

  app.get("/api/executions/:id", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const execution = await getOwnedExecution(id, user.id);
    if (!execution) return reply.status(404).send({ error: "Not found" });
    return {
      ...toExecutionDto(execution),
      jobName: execution.job.name,
      riskLevel: execution.job.riskLevel,
      timeline: execution.events.map((e) => ({
        at: e.createdAt,
        message: e.message,
        metadata: e.metadata,
      })),
    };
  });

  app.post("/api/executions/:id/retry", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const body = z.object({ force: z.boolean().optional() }).parse(request.body ?? {});
    const execution = await getOwnedExecution(id, user.id);
    if (!execution) return reply.status(404).send({ error: "Not found" });

    if (
      execution.status !== ExecutionStatus.FAILED &&
      execution.status !== ExecutionStatus.UNKNOWN
    ) {
      return reply.status(400).send({ error: "Execution cannot be retried in current state" });
    }

    if (
      execution.status === ExecutionStatus.UNKNOWN &&
      execution.retryDecision === "BLOCKED" &&
      !body.force
    ) {
      return reply.status(400).send({
        error: {
          code: "RETRY_BLOCKED",
          message: "Automatic retry is blocked for uncertain outcomes. Pass force: true to retry anyway.",
        },
        reason: execution.retryReason,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.execution.findUniqueOrThrow({ where: { id } });
      if (current.status === ExecutionStatus.FAILED) {
        assertTransition(current.status, ExecutionStatus.RETRYING);
        await tx.execution.update({
          where: { id },
          data: { status: ExecutionStatus.RETRYING },
        });
        assertTransition(ExecutionStatus.RETRYING, ExecutionStatus.QUEUED);
      } else if (current.status === ExecutionStatus.UNKNOWN) {
        assertTransition(current.status, ExecutionStatus.QUEUED);
      }
      return tx.execution.update({
        where: { id },
        data: {
          status: ExecutionStatus.QUEUED,
          attemptNumber: current.attemptNumber + 1,
          triggerType: "RETRY",
          workerId: null,
          startedAt: null,
          finishedAt: null,
          heartbeatAt: null,
          scheduledRetryAt: null,
          retryDecision: "MANUAL_ONLY",
          retryReason: "Manual retry requested by user",
        },
      });
    });

    await addExecutionEvent(
      id,
      body.force ? "Manual retry queued (forced despite UNKNOWN)" : "Manual retry queued"
    );
    await enqueueExecution(id);
    return toExecutionDto(updated);
  });

  app.post("/api/executions/:id/verify", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const execution = await getOwnedExecution(id, user.id);
    if (!execution) return reply.status(404).send({ error: "Not found" });
    if (execution.status !== ExecutionStatus.UNKNOWN) {
      return reply.status(400).send({ error: "Only UNKNOWN executions can be verified" });
    }

    await enqueueVerification(id);
    await addExecutionEvent(id, "Verification queued");
    const refreshed = await getOwnedExecution(id, user.id);
    return reply.status(202).send(toExecutionDto(refreshed!));
  });
}
