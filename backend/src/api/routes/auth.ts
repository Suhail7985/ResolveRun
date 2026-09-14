import { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import {
  COOKIE_NAME,
  hashPassword,
  signToken,
  verifyPassword,
  getUserFromRequest,
} from "../../lib/auth.js";
import { loadConfig } from "../../lib/config.js";
import { prisma } from "../../lib/prisma.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = registerSchema;

export async function registerAuthRoutes(app: FastifyInstance) {
  await app.register(async (authApp) => {
    await authApp.register(rateLimit, {
      max: 20,
      timeWindow: 60_000,
    });

    authApp.post("/api/auth/register", async (request, reply) => {
      const body = registerSchema.parse(request.body);
      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) {
        return reply.status(409).send({ error: "Email already registered" });
      }
      const user = await prisma.user.create({
        data: {
          email: body.email,
          passwordHash: await hashPassword(body.password),
        },
      });
      const token = signToken(user.id, user.email);
      reply.setCookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: loadConfig().NODE_ENV === "production",
      });
      return { id: user.id, email: user.email };
    });

    authApp.post("/api/auth/login", async (request, reply) => {
      const body = loginSchema.parse(request.body);
      const user = await prisma.user.findUnique({ where: { email: body.email } });
      if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }
      const token = signToken(user.id, user.email);
      reply.setCookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: loadConfig().NODE_ENV === "production",
      });
      return { id: user.id, email: user.email };
    });

    authApp.get("/api/auth/me", async (request, reply) => {
      const user = await getUserFromRequest(request);
      if (!user) return reply.status(401).send({ error: "Unauthorized" });
      return user;
    });

    authApp.post("/api/auth/logout", async (_request, reply) => {
      reply.clearCookie(COOKIE_NAME, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: loadConfig().NODE_ENV === "production",
    });
      return { ok: true };
    });
  });
}
