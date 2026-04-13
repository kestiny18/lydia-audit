import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@lydia/core": path.resolve(__dirname, "packages/core/src/index.ts"),
      "@lydia/report-renderer": path.resolve(__dirname, "packages/report-renderer/src/index.ts")
    }
  },
  test: {
    include: ["packages/*/tests/**/*.test.ts", "tests/**/*.test.ts"]
  }
});
