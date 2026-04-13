import path from "node:path";

import { describe, expect, it } from "vitest";

import { auditOpenClaw } from "../../packages/cli/src/index.js";

describe("audit report e2e", () => {
  it("creates a report from fixture logs", async () => {
    const fixtureDir = path.resolve("tests/fixtures/openclaw-audit");
    const result = await auditOpenClaw({
      inputPath: fixtureDir,
      format: "markdown",
      strict: true
    });

    expect(result.output).toContain("Lydia Audit Report");
    expect(result.output).toContain("High-risk tool lacks strong approval metadata");
    expect(result.exitCode).toBe(1);
  });
});
