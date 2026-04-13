import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { handleBeforeToolCall, resolveAuditLogPath } from "../src/index.js";

describe("before tool call hook", () => {
  it("writes a started event with a trace id", async () => {
    const baseDir = await mkdtemp(path.join(os.tmpdir(), "lydia-before-"));
    const event = await handleBeforeToolCall(
      { baseDir, workspaceId: "workspace-one" },
      {
        toolName: "exec",
        arguments: { command: "pnpm test" },
        sessionId: "session-1",
        requiresApproval: true,
        approvalMode: "strict",
        startedAt: "2026-04-14T00:00:00.000Z"
      }
    );

    const filePath = resolveAuditLogPath({
      baseDir,
      workspaceId: "workspace-one",
      date: new Date("2026-04-14T00:00:00.000Z")
    });
    const contents = await readFile(filePath, "utf8");

    expect(event.traceId).toBeTruthy();
    expect(contents).toContain("\"eventType\":\"tool_call.started\"");
  });
});
