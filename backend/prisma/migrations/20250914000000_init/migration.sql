-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('HTTP_REQUEST');
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "ExecutionStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'RETRYING', 'UNKNOWN', 'VERIFYING', 'CANCELLED');
CREATE TYPE "TriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'RETRY', 'RECOVERY');
CREATE TYPE "RetryDecision" AS ENUM ('NONE', 'SCHEDULED', 'BLOCKED', 'MANUAL_ONLY');

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "JobType" NOT NULL DEFAULT 'HTTP_REQUEST',
    "configuration" JSONB NOT NULL,
    "schedule" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "risk_level" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "next_run_at" TIMESTAMP(3),
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "jobs_user_id_idx" ON "jobs"("user_id");
CREATE INDEX "jobs_next_run_at_idx" ON "jobs"("next_run_at");
CREATE INDEX "jobs_enabled_next_run_at_idx" ON "jobs"("enabled", "next_run_at");

CREATE TABLE "executions" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "trigger_type" "TriggerType" NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "worker_id" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "heartbeat_at" TIMESTAMP(3),
    "scheduled_retry_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "http_status" INTEGER,
    "error_code" TEXT,
    "error_message" TEXT,
    "result_summary" TEXT,
    "retry_decision" "RetryDecision" NOT NULL DEFAULT 'NONE',
    "retry_reason" TEXT,
    "idempotency_key" TEXT,
    "schedule_occurrence_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "executions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "executions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "executions_job_id_idempotency_key_key" ON "executions"("job_id", "idempotency_key");
CREATE UNIQUE INDEX "executions_job_id_schedule_occurrence_key_key" ON "executions"("job_id", "schedule_occurrence_key");
CREATE INDEX "executions_job_id_idx" ON "executions"("job_id");
CREATE INDEX "executions_status_idx" ON "executions"("status");
CREATE INDEX "executions_created_at_idx" ON "executions"("created_at");
CREATE INDEX "executions_status_scheduled_retry_at_idx" ON "executions"("status", "scheduled_retry_at");

CREATE TABLE "execution_events" (
    "id" UUID NOT NULL,
    "execution_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "execution_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "execution_events_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "execution_events_execution_id_idx" ON "execution_events"("execution_id");
