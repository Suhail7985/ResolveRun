import { describe, it, expect, beforeEach } from "vitest";
import { integrationDbReady } from "./integration.js";
import { buildServer } from "../api/server.js";
import { createJob, createUser, resetDb } from "./helpers.js";
import { signToken } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

describe.skipIf(!integrationDbReady())("duplicate run now", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("same idempotency key returns one execution", async () => {
    const user = await createUser();
    const job = await createJob(user.id);
    const app = await buildServer();
    const token = signToken(user.id, user.email);
    const key = "run-once-key";

    const [r1, r2] = await Promise.all([
      app.inject({
        method: "POST",
        url: `/api/jobs/${job.id}/run`,
        headers: { "idempotency-key": key },
        cookies: { resolverun_token: token },
      }),
      app.inject({
        method: "POST",
        url: `/api/jobs/${job.id}/run`,
        headers: { "idempotency-key": key },
        cookies: { resolverun_token: token },
      }),
    ]);

    const body1 = JSON.parse(r1.body);
    const body2 = JSON.parse(r2.body);
    expect(body1.id).toBe(body2.id);

    const count = await prisma.execution.count({ where: { jobId: job.id } });
    expect(count).toBe(1);
    await app.close();
  });
});
