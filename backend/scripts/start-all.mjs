import { spawn } from "node:child_process";

/**
 * Run API + worker + scheduler in one process group (Render free web service).
 */
const commands = [
  ["node", ["dist/api/index.js"]],
  ["node", ["dist/worker/main.js"]],
  ["node", ["dist/scheduler/main.js"]],
];

for (const [cmd, args] of commands) {
  const child = spawn(cmd, args, { stdio: "inherit", env: process.env, shell: false });
  child.on("exit", (code) => {
    console.error(`${args.join(" ")} exited with ${code}`);
    process.exit(code ?? 1);
  });
}
