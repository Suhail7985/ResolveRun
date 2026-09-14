ALTER TABLE "jobs" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "jobs_deleted_at_idx" ON "jobs"("deleted_at");
