import { z } from "zod";

export const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export const jobConfigurationSchema = z.object({
  method: z.enum(httpMethods),
  url: z.string().url().max(2048),
  headers: z.record(z.string()).optional().default({}),
  body: z.string().max(65536).optional(),
  timeoutMs: z.number().int().min(1000).max(120000).default(30000),
  verification: z
    .object({
      method: z.enum(["GET"]).default("GET"),
      url: z.string().url().max(2048),
      expectStatus: z.number().int().min(100).max(599).default(200),
    })
    .optional(),
});

export type JobConfiguration = z.infer<typeof jobConfigurationSchema>;

export function isSideEffectingMethod(method: string): boolean {
  return method !== "GET";
}

export const createJobSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  schedule: z.string().max(100).optional().nullable(),
  enabled: z.boolean().optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  configuration: jobConfigurationSchema,
});

export const updateJobSchema = createJobSchema.partial();
