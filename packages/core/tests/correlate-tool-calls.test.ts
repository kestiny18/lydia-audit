import { describe, expect, it } from "vitest";

import { correlateToolCalls, type AuditEvent } from "../src/index.js";

describe("correlate tool calls", () => {
  it("combines started and completed events into one record", () => {
    const events: AuditEvent[] = [
      {
        version: "1",
        eventId: "1",
        eventType: "tool_call.started",
        timestamp: "2026-04-13T07:00:00.000Z",
        source: "openclaw-plugin",
        traceId: "trace-1",
        payload: { toolName: "exec", argumentsSummary: "pnpm test", riskTags: ["execution"] }
      },
      {
        version: "1",
        eventId: "2",
        eventType: "tool_call.completed",
        timestamp: "2026-04-13T07:00:02.000Z",
        source: "openclaw-plugin",
        traceId: "trace-1",
        payload: { toolName: "exec", outcome: "success", durationMs: 2000, resultSummary: "done" }
      }
    ];

    const [record] = correlateToolCalls(events);
    expect(record.outcome).toBe("success");
    expect(record.durationMs).toBe(2000);
    expect(record.argumentsSummary).toBe("pnpm test");
  });

  it("keeps unknown outcome when a completed event is missing", () => {
    const [record] = correlateToolCalls([
      {
        version: "1",
        eventId: "1",
        eventType: "tool_call.started",
        timestamp: "2026-04-13T07:00:00.000Z",
        source: "openclaw-plugin",
        traceId: "trace-1",
        payload: { toolName: "read_file", argumentsSummary: "foo.txt", riskTags: ["filesystem"] }
      }
    ]);

    expect(record.outcome).toBe("unknown");
  });
});
