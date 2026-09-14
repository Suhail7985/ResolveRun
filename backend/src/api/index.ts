import { buildServer } from "./server.js";
import { loadConfig } from "../lib/config.js";
import { log } from "../lib/logger.js";

async function main() {
  const config = loadConfig();
  const app = await buildServer();
  const port = config.PORT ?? config.API_PORT;
  await app.listen({ port, host: config.API_HOST });
  log.info("ApiStarted", { port });
}

main().catch((err) => {
  log.error("ApiFatal", { error: String(err) });
  process.exit(1);
});
