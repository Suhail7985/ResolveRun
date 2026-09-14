import { FastifyInstance } from "fastify";

const flakyAttempts = new Map<string, number>();

export async function registerDemoRoutes(app: FastifyInstance) {
  app.get("/api/demo/health", async () => ({
    ok: true,
    message: "ResolveRun demo endpoint — safe for local evaluation",
  }));

  app.get("/api/demo/success", async () => ({
    ok: true,
    timestamp: new Date().toISOString(),
  }));

  app.get("/api/demo/flaky/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const attempt = (flakyAttempts.get(key) ?? 0) + 1;
    flakyAttempts.set(key, attempt);
    if (attempt < 3) {
      return reply.status(500).send({ ok: false, attempt, message: "Simulated transient failure" });
    }
    return { ok: true, attempt, message: "Succeeded after retries" };
  });

  app.post("/api/demo/payment", async (_request, reply) => {
    await new Promise((r) => setTimeout(r, 120_000));
    return reply.send({ ok: true });
  });

  app.get("/api/demo/not-found", async (_request, reply) => {
    return reply.status(404).send({ ok: false });
  });
}
