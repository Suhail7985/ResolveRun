import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const maxAttempts = 45;

async function main(): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("Database is ready");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Database did not become ready in time");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
