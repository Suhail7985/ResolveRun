import { loadConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { runSchedulerTick } from "./run.js";

async function main(): Promise<void> {
  const { SCHEDULER_INTERVAL_MS } = loadConfig();
  log.info("SchedulerStarted");
  const tick = async () => {
    try {
      await runSchedulerTick();
    } catch (err) {
      log.error("SchedulerError", { error: String(err) });
    }
  };
  await tick();
  setInterval(tick, SCHEDULER_INTERVAL_MS);
}

main().catch((err) => {
  log.error("SchedulerFatal", { error: String(err) });
  process.exit(1);
});
