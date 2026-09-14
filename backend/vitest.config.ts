import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    testTimeout: 60000,
    globalSetup: ["src/tests/global-setup.ts"],
    setupFiles: ["src/tests/setup.ts"],
  },
});
