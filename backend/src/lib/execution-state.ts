import { ExecutionStatus } from "@prisma/client";

const ALLOWED: Record<ExecutionStatus, ExecutionStatus[]> = {
  QUEUED: [ExecutionStatus.RUNNING, ExecutionStatus.CANCELLED],
  RUNNING: [ExecutionStatus.SUCCEEDED, ExecutionStatus.FAILED, ExecutionStatus.UNKNOWN],
  FAILED: [ExecutionStatus.RETRYING],
  RETRYING: [ExecutionStatus.QUEUED],
  UNKNOWN: [ExecutionStatus.VERIFYING, ExecutionStatus.QUEUED],
  VERIFYING: [
    ExecutionStatus.SUCCEEDED,
    ExecutionStatus.QUEUED,
    ExecutionStatus.UNKNOWN,
  ],
  SUCCEEDED: [],
  CANCELLED: [],
};

export function canTransition(from: ExecutionStatus, to: ExecutionStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(from: ExecutionStatus, to: ExecutionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid execution transition: ${from} -> ${to}`);
  }
}
