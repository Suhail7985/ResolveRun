import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import rateLimit from "@fastify/rate-limit";
import { loadConfig } from "../lib/config.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerJobRoutes } from "./routes/jobs.js";
import { registerExecutionRoutes } from "./routes/executions.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerDemoRoutes } from "./routes/demo.js";
import { prisma } from "../lib/prisma.js";
import { checkRedisHealth } from "../lib/queue.js";

async function buildServer() {
  const config = loadConfig();
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: 120,
    timeWindow: 60_000,
    allowList: ["/api/health", "/api/demo"],
  });
  await app.register(swagger, {
    openapi: {
      info: { title: "ResolveRun API", version: "1.0.0", description: "ResolveRun job automation API" },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/api/docs" });

  app.get("/api/health", async (_request, reply) => {
    const checks = { postgres: false, redis: false };
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.postgres = true;
    } catch {
      checks.postgres = false;
    }
    checks.redis = await checkRedisHealth();
    const ok = checks.postgres && checks.redis;
    return reply.status(ok ? 200 : 503).send({ status: ok ? "ok" : "degraded", checks });
  });

  await registerDemoRoutes(app);
  await registerAuthRoutes(app);
  await registerJobRoutes(app);
  await registerExecutionRoutes(app);
  await registerDashboardRoutes(app);

  return app;
}

export { buildServer };
