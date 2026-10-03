import { defineConfig } from "vitest/config";

process.env["TEST_DATABASE_NAME"] ??= "bolao_cli_integration_test";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.spec.ts"],
    globalSetup: ["@bolao/core/testing/global-setup"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
