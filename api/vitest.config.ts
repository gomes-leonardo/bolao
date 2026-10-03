import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    exclude: ["src/**/*.integration.spec.ts", "node_modules", "dist"],
  },
});
