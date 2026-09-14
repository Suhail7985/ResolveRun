import { Worker } from "bullmq";
import { loadConfig } from "../lib/config.js";
import { claimExecutionById } from "../lib/claim.js";
import { log } from "../lib/logger.js";
import { promoteDueRetries } from "../lib/promote-retries.js";
import { recoverStaleExecutions } from "../lib/recovery.js";
import { addExecutionEvent } from "../lib/events.js";
import { processExecution, runVerification } from "./process-execution.js";
import {
  EXECUTION_QUEUE_NAME,
  RETRY_QUEUE_NAME,
  VERIFICATION_QUEUE_NAME,
  getRedisConnection,
  closeQueueConnections,
} from "../lib/queue.js";

let shuttingDown = false;

process.on("SIGTERM", () => {
  shuttingDown = true;
  log.info("WorkerShutdownRequested");
});
process.on("SIGINT", () => {
  shuttingDown = true;
});

async function maintenanceLoop(): Promise<void> {
  const config = loadConfig();
  let lastRecovery = 0;
  while (!shuttingDown) {
    await promoteDueRetries();
    if (Date.now() - lastRecovery > config.RECOVERY_INTERVAL_MS) {
      await recoverStaleExecutions();
      lastRecovery = Date.now();
    }
    await new Promise((r) => setTimeout(r, config.WORKER_POLL_MS));
  }
}

async function handleExecutionJob(executionId: string, workerId: string, heartbeatMs: number) {
  const claimed = await claimExecutionById(executionId, workerId);
  if (!claimed) {
    log.info("ExecutionClaimSkipped", {
      execution_id: executionId,
      worker_id: workerId,
    });
    return;
  }

  log.info("ExecutionClaimed", {
    execution_id: executionId,
    worker_id: workerId,
  });
  await addExecutionEvent(executionId, `Worker ${workerId} claimed execution`, {
    workerId,
  });

  try {
    await processExecution(executionId, workerId, heartbeatMs);
  } catch (err) {
    log.error("ExecutionProcessingError", {
      execution_id: executionId,
      error: String(err),
    });
  }
}

async function start(): Promise<void> {
  const config = loadConfig();
  log.info("WorkerStarted", { worker_id: config.WORKER_ID });

  const connection = getRedisConnection();
  const workerOpts = { connection, concurrency: 5 };

  const onFailed = (job: { id?: string } | undefined, err: Error) => {
    log.error("QueueJobFailed", { job_id: job?.id, error: String(err) });
  };

  const executionWorker = new Worker<{ executionId: string }>(
    EXECUTION_QUEUE_NAME,
    async (job) => {
      await handleExecutionJob(job.data.executionId, config.WORKER_ID, config.WORKER_HEARTBEAT_MS);
    },
    workerOpts
  );
  executionWorker.on("failed", onFailed);

  const retryWorker = new Worker<{ executionId: string }>(
    RETRY_QUEUE_NAME,
    async (job) => {
      await handleExecutionJob(job.data.executionId, config.WORKER_ID, config.WORKER_HEARTBEAT_MS);
    },
    workerOpts
  );
  retryWorker.on("failed", onFailed);

  const verificationWorker = new Worker<{ executionId: string }>(
    VERIFICATION_QUEUE_NAME,
    async (job) => {
      try {
        await runVerification(job.data.executionId);
      } catch (err) {
        log.error("VerificationProcessingError", {
          execution_id: job.data.executionId,
          error: String(err),
        });
      }
    },
    { connection, concurrency: 3 }
  );
  verificationWorker.on("failed", onFailed);

  void maintenanceLoop();

  while (!shuttingDown) {
    await new Promise((r) => setTimeout(r, 1000));
  }

  await executionWorker.close();
  await retryWorker.close();
  await verificationWorker.close();
  await closeQueueConnections();
  log.info("WorkerStopped", { worker_id: config.WORKER_ID });
}

start().catch((err) => {
  log.error("WorkerFatal", { error: String(err) });
  process.exit(1);
});
