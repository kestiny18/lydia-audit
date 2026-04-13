import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { handleAfterToolCall, resolveAuditLogPath } from "../src/index.js";

describe("after tool call hook", () => {
  it("writes a completed event with outcome metadata", async () => {
    const baseDir = await mkdtemp(path.join(os.tmpdir(), "lydia-after-"));
    const event = await handleAfterToolCall(
      { baseDir, workspaceId: "workspace-two" },
      {
        toolName: "exec",
        traceId: "trace-1",
        sessionId: "session-2",
        startedAt: "2026-04-14T00:00:00.000Z",
        result: { ok: true },
        outcome: "success"
      }
    );

    const filePath = resolveAuditLogPath({
      baseDir,
      workspaceId: "workspace-two",
      date: new Date(event.timestamp)
    });
    const contents = await readFile(filePath, "utf8");

    expect(event.payload).toMatchObject({ toolName: "exec", outcome: "success" });
    expect(contents).toContain("\"eventType\":\"tool_call.completed\"");
  });
});
