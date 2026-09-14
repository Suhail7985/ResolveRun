import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });

export default async function globalSetup(): Promise<void> {
  process.env.SKIP_QUEUE = "true";
  if (!process.env.AUTH_SECRET) {
    process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long";
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    process.env.INTEGRATION_DB = "true";
  } catch {
    process.env.INTEGRATION_DB = "false";
  } finally {
    await prisma.$disconnect();
  }
}
