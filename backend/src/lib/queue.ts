import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { loadConfig } from "./config.js";

export const EXECUTION_QUEUE_NAME = "job-executions";
export const RETRY_QUEUE_NAME = "job-retries";
export const VERIFICATION_QUEUE_NAME = "job-verification";

let redis: Redis | null = null;
let executionQueue: Queue | null = null;
let retryQueue: Queue | null = null;
let verificationQueue: Queue | null = null;

export function getRedisConnection(): Redis {
  if (!redis) {
    const { REDIS_URL } = loadConfig();
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      tls: REDIS_URL.startsWith("rediss://") ? {} : undefined,
    });
  }
  return redis;
}

function makeQueue(name: string): Queue {
  return new Queue(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 1,
    },
  });
}

export function getExecutionQueue(): Queue {
  if (!executionQueue) executionQueue = makeQueue(EXECUTION_QUEUE_NAME);
  return executionQueue;
}

export function getRetryQueue(): Queue {
  if (!retryQueue) retryQueue = makeQueue(RETRY_QUEUE_NAME);
  return retryQueue;
}

export function getVerificationQueue(): Queue {
  if (!verificationQueue) verificationQueue = makeQueue(VERIFICATION_QUEUE_NAME);
  return verificationQueue;
}

/** Enqueue work by execution id; PostgreSQL remains authoritative for state. */
export async function enqueueExecution(executionId: string): Promise<void> {
  if (process.env.SKIP_QUEUE === "true") return;
  await getExecutionQueue().add("execute", { executionId }, { jobId: `exec-${executionId}` });
}

/** Retry promotions use a dedicated queue (same worker handler). */
export async function enqueueRetryExecution(executionId: string): Promise<void> {
  if (process.env.SKIP_QUEUE === "true") return;
  await getRetryQueue().add("retry", { executionId }, { jobId: `retry-${executionId}` });
}

export async function enqueueVerification(executionId: string): Promise<void> {
  if (process.env.SKIP_QUEUE === "true") return;
  await getVerificationQueue().add(
    "verify",
    { executionId },
    { jobId: `verify-${executionId}` }
  );
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await getRedisConnection().ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

export async function closeQueueConnections(): Promise<void> {
  await executionQueue?.close();
  await retryQueue?.close();
  await verificationQueue?.close();
  await redis?.quit();
  executionQueue = null;
  retryQueue = null;
  verificationQueue = null;
  redis = null;
}
