import { describe, it, expect, beforeEach } from "vitest";
import { integrationDbReady } from "./integration.js";
import { buildServer } from "../api/server.js";
import { createJob, createUser, resetDb } from "./helpers.js";
import { signToken } from "../lib/auth.js";

describe.skipIf(!integrationDbReady())("authorization", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("user A cannot access user B job", async () => {
    const userA = await createUser("a@test.com");
    const userB = await createUser("b@test.com");
    const jobB = await createJob(userB.id);

    const app = await buildServer();
    const tokenA = signToken(userA.id, userA.email);

    const res = await app.inject({
      method: "GET",
      url: `/api/jobs/${jobB.id}`,
      cookies: { resolverun_token: tokenA },
    });

    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
