import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

process.env["TEST_DATABASE_NAME"] ??= "bolao_api_integration_test";

export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    environment: "node",
    include: ["src/**/*.integration.spec.ts"],
    globalSetup: ["@bolao/core/testing/global-setup"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
