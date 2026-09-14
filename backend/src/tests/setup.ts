import { config } from "dotenv";
import { resolve } from "node:path";
import { beforeAll, afterAll } from "vitest";
import { prisma } from "../lib/prisma.js";

config({ path: resolve(process.cwd(), ".env") });

beforeAll(async () => {
  process.env.SKIP_QUEUE = "true";
  if (!process.env.AUTH_SECRET) {
    process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long";
  }
  if (!process.env.DATABASE_URL?.includes("test")) {
    console.warn("Set DATABASE_URL to a test database before running integration tests");
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
