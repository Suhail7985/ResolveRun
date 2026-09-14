import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  AUTH_SECRET: z.string().min(16),
  API_PORT: z.coerce.number().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  WORKER_ID: z.string().default("worker-1"),
  WORKER_POLL_MS: z.coerce.number().default(1000),
  WORKER_HEARTBEAT_MS: z.coerce.number().default(5000),
  WORKER_LEASE_MS: z.coerce.number().default(60000),
  SCHEDULER_INTERVAL_MS: z.coerce.number().default(15000),
  RECOVERY_INTERVAL_MS: z.coerce.number().default(30000),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}
