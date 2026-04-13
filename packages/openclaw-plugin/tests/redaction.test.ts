import { describe, expect, it } from "vitest";

import { redactValue, summarizeArgs } from "../src/index.js";

describe("redaction helpers", () => {
  it("masks likely secret values", () => {
    expect(
      redactValue({
        apiKey: "abcdefghijklmnopqrstuvwxyz0123456789"
      })
    ).toEqual({
      apiKey: "[REDACTED]"
    });
  });

  it("preserves safe metadata in summaries", () => {
    const summary = summarizeArgs({
      path: "src/index.ts",
      command: "pnpm test"
    });

    expect(summary.summary).toContain("path=src/index.ts");
    expect(summary.preview.command).toBe("pnpm test");
  });
});
