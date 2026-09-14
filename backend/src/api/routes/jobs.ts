import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { requireAuth } from "../plugins/auth.js";
import { prisma } from "../../lib/prisma.js";
import { createJobSchema, updateJobSchema } from "../../lib/job-config.js";
import { validateCron, getNextRun, describeCron } from "../../lib/cron.js";
import { toJobDto, toExecutionDto } from "../mappers.js";
import { createAndQueueExecution } from "../../lib/execution-create.js";
import { activeJobWhere } from "../../lib/job-scope.js";
import { z } from "zod";

export async function registerJobRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/api/jobs")) return;
    await requireAuth(request, reply);
  });

  app.get("/api/jobs", async (request) => {
    const user = request.user!;
    const query = z
      .object({
        search: z.string().optional(),
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().default(20),
      })
      .parse(request.query);

    const where: Prisma.JobWhereInput = activeJobWhere({
      userId: user.id,
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" } }
        : {}),
    });

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.job.count({ where }),
    ]);

    const withStats = await Promise.all(
      jobs.map(async (job) => {
        const [lastExec, counts] = await Promise.all([
          prisma.execution.findFirst({
            where: { jobId: job.id },
            orderBy: { createdAt: "desc" },
          }),
          prisma.execution.groupBy({
            by: ["status"],
            where: { jobId: job.id },
            _count: true,
          }),
        ]);
        const totalExec = counts.reduce((s, c) => s + c._count, 0);
        const succeeded = counts.find((c) => c.status === "SUCCEEDED")?._count ?? 0;
        return {
          ...toJobDto(job),
          scheduleDescription: job.schedule ? describeCron(job.schedule) : null,
          lastExecutionStatus: lastExec?.status ?? null,
          successRate: totalExec > 0 ? Math.round((succeeded / totalExec) * 100) : null,
        };
      })
    );

    return { items: withStats, total, page: query.page, pageSize: query.pageSize };
  });

  app.post("/api/jobs", async (request, reply) => {
    const user = request.user!;
    const body = createJobSchema.parse(request.body);
    if (body.schedule) validateCron(body.schedule);

    const job = await prisma.job.create({
      data: {
        userId: user.id,
        name: body.name,
        description: body.description,
        configuration: body.configuration,
        schedule: body.schedule ?? null,
        enabled: body.enabled ?? true,
        riskLevel: body.riskLevel ?? "MEDIUM",
        nextRunAt: body.schedule && (body.enabled ?? true) ? getNextRun(body.schedule) : null,
      },
    });
    return reply.status(201).send(toJobDto(job));
  });

  app.get("/api/jobs/:id", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const job = await prisma.job.findFirst({ where: activeJobWhere({ id, userId: user.id }) });
    if (!job) return reply.status(404).send({ error: "Not found" });
    return {
      ...toJobDto(job),
      scheduleDescription: job.schedule ? describeCron(job.schedule) : null,
    };
  });

  async function updateJobHandler(request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const body = updateJobSchema.parse(request.body);
    if (body.schedule) validateCron(body.schedule);

    const existing = await prisma.job.findFirst({ where: activeJobWhere({ id, userId: user.id }) });
    if (!existing) return reply.status(404).send({ error: "Not found" });

    const schedule = body.schedule !== undefined ? body.schedule : existing.schedule;
    const enabled = body.enabled !== undefined ? body.enabled : existing.enabled;

    const job = await prisma.job.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.configuration !== undefined ? { configuration: body.configuration } : {}),
        ...(body.riskLevel !== undefined ? { riskLevel: body.riskLevel } : {}),
        schedule,
        enabled,
        nextRunAt:
          schedule && enabled ? getNextRun(schedule) : schedule ? existing.nextRunAt : null,
      },
    });
    return toJobDto(job);
  }

  app.put("/api/jobs/:id", updateJobHandler);
  app.patch("/api/jobs/:id", updateJobHandler);

  app.delete("/api/jobs/:id", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const deleted = await prisma.job.updateMany({
      where: activeJobWhere({ id, userId: user.id }),
      data: { deletedAt: new Date(), enabled: false, nextRunAt: null },
    });
    if (deleted.count === 0) return reply.status(404).send({ error: "Not found" });
    return reply.status(204).send();
  });

  app.post("/api/jobs/:id/enable", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const job = await prisma.job.findFirst({ where: activeJobWhere({ id, userId: user.id }) });
    if (!job) return reply.status(404).send({ error: "Not found" });
    const updated = await prisma.job.update({
      where: { id },
      data: {
        enabled: true,
        nextRunAt: job.schedule ? getNextRun(job.schedule) : null,
      },
    });
    return toJobDto(updated);
  });

  app.post("/api/jobs/:id/disable", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const updated = await prisma.job.updateMany({
      where: activeJobWhere({ id, userId: user.id }),
      data: { enabled: false, nextRunAt: null },
    });
    if (updated.count === 0) return reply.status(404).send({ error: "Not found" });
    const job = await prisma.job.findUniqueOrThrow({ where: { id } });
    return toJobDto(job);
  });

  app.post("/api/jobs/:id/run", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const idempotencyKey =
      (request.headers["idempotency-key"] as string | undefined)?.slice(0, 128) ?? null;

    const job = await prisma.job.findFirst({ where: activeJobWhere({ id, userId: user.id }) });
    if (!job) return reply.status(404).send({ error: "Not found" });

    if (idempotencyKey) {
      const existing = await prisma.execution.findFirst({
        where: { jobId: job.id, idempotencyKey },
      });
      if (existing) {
        return reply.status(200).send(toExecutionDto(existing));
      }
    }

    try {
      const execution = await createAndQueueExecution({
        jobId: job.id,
        triggerType: "MANUAL",
        idempotencyKey,
        maxAttempts: 3,
      });
      return reply.status(201).send(toExecutionDto(execution));
    } catch (e: unknown) {
      if (idempotencyKey && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const existing = await prisma.execution.findFirst({
          where: { jobId: job.id, idempotencyKey },
        });
        if (existing) return reply.status(200).send(toExecutionDto(existing));
      }
      throw e;
    }
  });

  app.get("/api/jobs/:id/executions", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const job = await prisma.job.findFirst({ where: activeJobWhere({ id, userId: user.id }) });
    if (!job) return reply.status(404).send({ error: "Not found" });

    const query = z
      .object({
        status: z.string().optional(),
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().default(20),
      })
      .parse(request.query);

    const where = {
      jobId: job.id,
      ...(query.status ? { status: query.status as never } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.execution.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.execution.count({ where }),
    ]);

    return {
      items: items.map(toExecutionDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  });
}
