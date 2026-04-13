import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { auditOpenClaw } from "../src/index.js";

const fixtureEvent = (eventType: "tool_call.started" | "tool_call.completed", payload: Record<string, unknown>) =>
  JSON.stringify({
    version: "1",
    eventId: `${eventType}-1`,
    eventType,
    timestamp: eventType === "tool_call.started" ? "2026-04-14T00:00:00.000Z" : "2026-04-14T00:00:01.000Z",
    source: "openclaw-plugin",
    traceId: "trace-1",
    payload
  });

describe("audit openclaw command", () => {
  it("loads events and renders a markdown report", async () => {
    const dir = path.join(os.tmpdir(), `lydia-cli-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "events.jsonl"),
      [
        fixtureEvent("tool_call.started", {
          toolName: "exec",
          argumentsSummary: "pnpm test",
          riskTags: ["execution"]
        }),
        fixtureEvent("tool_call.completed", {
          toolName: "exec",
          outcome: "success",
          resultSummary: "done",
          riskTags: ["execution"]
        })
      ].join("\n"),
      "utf8"
    );

    const result = await auditOpenClaw({
      inputPath: dir,
      format: "markdown"
    });

    expect(result.output).toContain("Lydia Audit Report");
    expect(result.report.findings.length).toBeGreaterThan(0);
  });

  it("returns a non-zero exit code in strict mode for high severity findings", async () => {
    const dir = path.join(os.tmpdir(), `lydia-cli-strict-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "events.jsonl"),
      fixtureEvent("tool_call.started", {
        toolName: "exec",
        argumentsSummary: "rm -rf build",
        riskTags: ["execution"]
      }),
      "utf8"
    );

    const result = await auditOpenClaw({
      inputPath: dir,
      format: "json",
      strict: true
    });

    expect(result.exitCode).toBe(1);
  });
});
