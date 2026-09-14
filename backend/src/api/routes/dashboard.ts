import { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import { prisma } from "../../lib/prisma.js";
import { activeJobWhere } from "../../lib/job-scope.js";
import { toExecutionDto } from "../mappers.js";

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request, reply) => {
    if (request.url !== "/api/dashboard") return;
    await requireAuth(request, reply);
  });

  app.get("/api/dashboard", async (request) => {
    const user = request.user!;
    const jobIds = (
      await prisma.job.findMany({
        where: activeJobWhere({ userId: user.id }),
        select: { id: true },
      })
    ).map((j) => j.id);

    if (jobIds.length === 0) {
      return {
        totalJobs: 0,
        activeJobs: 0,
        runningExecutions: 0,
        successRate: null,
        failedExecutions: 0,
        unknownExecutions: 0,
        attentionCount: 0,
        recentExecutions: [],
      };
    }

    const [totalJobs, activeJobs, statusCounts, recent] = await Promise.all([
      prisma.job.count({ where: activeJobWhere({ userId: user.id }) }),
      prisma.job.count({ where: activeJobWhere({ userId: user.id, enabled: true }) }),
      prisma.execution.groupBy({
        by: ["status"],
        where: { jobId: { in: jobIds } },
        _count: true,
      }),
      prisma.execution.findMany({
        where: { jobId: { in: jobIds } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const count = (s: string) => statusCounts.find((c) => c.status === s)?._count ?? 0;
    const succeeded = count("SUCCEEDED");
    const terminal = succeeded + count("FAILED") + count("UNKNOWN");
    const successRate = terminal > 0 ? Math.round((succeeded / terminal) * 100) : null;

    const unknownExecutions = count("UNKNOWN");
    const failedExecutions = count("FAILED");

    return {
      totalJobs,
      activeJobs,
      runningExecutions: count("RUNNING") + count("QUEUED"),
      successRate,
      failedExecutions,
      unknownExecutions,
      attentionCount: unknownExecutions,
      recentExecutions: recent.map(toExecutionDto),
    };
  });
}
