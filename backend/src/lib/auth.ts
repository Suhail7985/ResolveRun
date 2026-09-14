import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { FastifyRequest } from "fastify";
import { loadConfig } from "./config.js";
import { prisma } from "./prisma.js";

const COOKIE_NAME = "resolverun_token";

export { COOKIE_NAME };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string, email: string): string {
  const { AUTH_SECRET } = loadConfig();
  return jwt.sign({ sub: userId, email }, AUTH_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { sub: string; email: string } {
  const { AUTH_SECRET } = loadConfig();
  const payload = jwt.verify(token, AUTH_SECRET) as { sub: string; email: string };
  return payload;
}

export async function getUserFromRequest(
  request: FastifyRequest
): Promise<{ id: string; email: string } | null> {
  const token =
    request.cookies[COOKIE_NAME] ??
    (request.headers.authorization?.startsWith("Bearer ")
      ? request.headers.authorization.slice(7)
      : null);
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
    return user;
  } catch {
    return null;
  }
}
