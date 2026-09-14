import { FastifyReply, FastifyRequest } from "fastify";
import { getUserFromRequest } from "../../lib/auth.js";

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  request.user = user;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string; email: string };
  }
}
