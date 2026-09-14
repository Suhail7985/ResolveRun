import { describe, it, expect, beforeEach } from "vitest";
import { claimExecutionById } from "../lib/claim.js";
import { createJob, createQueuedExecution, createUser, resetDb } from "./helpers.js";
import { integrationDbReady } from "./integration.js";

describe.skipIf(!integrationDbReady())("concurrent worker claim", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("only one worker claims the same execution", async () => {
    const user = await createUser();
    const job = await createJob(user.id);
    const execution = await createQueuedExecution(job.id);

    const [a, b] = await Promise.all([
      claimExecutionById(execution.id, "worker-a"),
      claimExecutionById(execution.id, "worker-b"),
    ]);

    expect(a !== b).toBe(true);
    expect(Number(a) + Number(b)).toBe(1);
  });
});
