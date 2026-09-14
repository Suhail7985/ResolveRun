import { hashPassword } from "./lib/auth.js";
import { prisma } from "./lib/prisma.js";

export const DEMO_EMAIL = "reviewer@resolverun.app";
export const DEMO_PASSWORD = "Reviewer123!";

async function seedDemoUser(): Promise<void> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    await prisma.user.update({
      where: { email: DEMO_EMAIL },
      data: { passwordHash },
    });
    console.log("ResolveRun demo user updated:", DEMO_EMAIL);
  } else {
    await prisma.user.create({
      data: { email: DEMO_EMAIL, passwordHash },
    });
    console.log("ResolveRun demo user created:", DEMO_EMAIL);
  }
}

seedDemoUser()
  .catch((err) => {
    console.error("Demo seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
