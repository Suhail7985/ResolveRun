import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.join(root, "backend");

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: true });
  return result.status === 0;
}

console.log("Starting Postgres and Redis (Docker)...");
const dockerOk = run("docker", ["compose", "up", "-d", "postgres", "redis"], root);

if (dockerOk) {
  console.log("Waiting for database...");
  if (!run("npx", ["tsx", "scripts/wait-db.ts"], backend)) {
    console.warn("Database wait failed; integration tests may fail.");
  } else {
    run("npx", ["prisma", "migrate", "deploy"], backend);
  }
} else {
  console.warn(
    "Docker not available. Unit tests will run; integration tests need Postgres."
  );
}

const env = { ...process.env };
if (dockerOk) {
  env.INTEGRATION_DB = "true";
}

const testsOk = spawnSync("npx", ["vitest", "run"], {
  cwd: backend,
  stdio: "inherit",
  shell: true,
  env,
}).status === 0;

process.exit(testsOk ? 0 : 1);
