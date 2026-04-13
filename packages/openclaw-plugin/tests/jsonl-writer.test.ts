import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { AuditEvent } from "@lydia/core";

import { appendAuditEvent, resolveAuditLogPath } from "../src/index.js";

const createEvent = (eventId: string): AuditEvent => ({
  version: "1",
  eventId,
  eventType: "tool_call.started",
  timestamp: "2026-04-13T07:00:00.000Z",
  source: "openclaw-plugin",
  traceId: `trace-${eventId}`,
  payload: {
    toolName: "exec",
    argumentsSummary: "pnpm test"
  }
});

describe("jsonl writer", () => {
  it("creates the parent directory before writing", async () => {
    const baseDir = await mkdtemp(path.join(os.tmpdir(), "lydia-audit-"));
    const filePath = resolveAuditLogPath({
      baseDir,
      workspaceId: "workspace-alpha"
    });

    await appendAuditEvent(filePath, createEvent("evt-1"));

    const contents = await readFile(filePath, "utf8");
    expect(contents).toContain("\"eventId\":\"evt-1\"");
  });

  it("appends one event per line and preserves prior events", async () => {
    const baseDir = await mkdtemp(path.join(os.tmpdir(), "lydia-audit-"));
    const filePath = resolveAuditLogPath({
      baseDir,
      workspaceId: "workspace-beta"
    });

    await appendAuditEvent(filePath, createEvent("evt-1"));
    await appendAuditEvent(filePath, createEvent("evt-2"));

    const lines = (await readFile(filePath, "utf8")).trim().split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("\"eventId\":\"evt-1\"");
    expect(lines[1]).toContain("\"eventId\":\"evt-2\"");
  });
});
