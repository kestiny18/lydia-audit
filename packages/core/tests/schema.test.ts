import { describe, expect, it } from "vitest";

import {
  isAuditEvent,
  isFinding,
  isToolAuditRecord,
  type AuditEvent,
  type Finding,
  type ToolAuditRecord
} from "../src/index.js";

describe("audit schema", () => {
  it("accepts a valid audit event", () => {
    const event: AuditEvent = {
      version: "1",
      eventId: "evt-1",
      eventType: "tool_call.started",
      timestamp: "2026-04-13T07:00:00.000Z",
      source: "openclaw-plugin",
      sessionId: "session-1",
      traceId: "trace-1",
      payload: {
        toolName: "exec",
        argumentsSummary: "run npm test"
      }
    };

    expect(isAuditEvent(event)).toBe(true);
  });

  it("rejects an invalid audit event version", () => {
    expect(
      isAuditEvent({
        version: "2",
        eventId: "evt-1",
        eventType: "tool_call.started",
        timestamp: "2026-04-13T07:00:00.000Z",
        source: "openclaw-plugin",
        traceId: "trace-1",
        payload: {}
      })
    ).toBe(false);
  });

  it("accepts a valid tool audit record", () => {
    const record: ToolAuditRecord = {
      traceId: "trace-1",
      toolName: "exec",
      startedAt: "2026-04-13T07:00:00.000Z",
      argumentsSummary: "run npm test",
      outcome: "success",
      riskTags: ["execution"]
    };

    expect(isToolAuditRecord(record)).toBe(true);
  });

  it("accepts a valid finding", () => {
    const finding: Finding = {
      id: "finding-1",
      ruleId: "EXEC-001",
      severity: "high",
      title: "Execution-capable tool invoked",
      summary: "The agent invoked an execution-capable tool.",
      evidence: ["toolName=exec"],
      recommendation: "Require stronger approval before execution tools run."
    };

    expect(isFinding(finding)).toBe(true);
  });
});
