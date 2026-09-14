import { Prisma } from "@prisma/client";

/** Active jobs visible in lists and schedulable. */
export function activeJobWhere(extra?: Prisma.JobWhereInput): Prisma.JobWhereInput {
  return { deletedAt: null, ...extra };
}
