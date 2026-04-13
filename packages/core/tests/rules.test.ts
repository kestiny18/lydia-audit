import { describe, expect, it } from "vitest";

import { evaluateRules, type ToolAuditRecord } from "../src/index.js";

describe("audit rules", () => {
  it("flags risky execution without approval", () => {
    const records: ToolAuditRecord[] = [
      {
        traceId: "trace-1",
        toolName: "exec",
        startedAt: "2026-04-13T07:00:00.000Z",
        argumentsSummary: "rm -rf build",
        outcome: "success",
        riskTags: ["execution"]
      }
    ];

    const findings = evaluateRules(records);
    expect(findings.some((finding) => finding.ruleId === "EXEC-001")).toBe(true);
    expect(findings.some((finding) => finding.ruleId === "APR-001")).toBe(true);
  });

  it("flags repeated bursts and failed execution attempts", () => {
    const records: ToolAuditRecord[] = Array.from({ length: 4 }, (_, index) => ({
      traceId: `trace-${index}`,
      sessionId: "session-1",
      toolName: "exec",
      startedAt: `2026-04-13T07:00:0${index}.000Z`,
      argumentsSummary: "pnpm test",
      outcome: index < 2 ? "error" : "success",
      riskTags: ["execution"]
    }));

    const findings = evaluateRules(records);
    expect(findings.some((finding) => finding.ruleId === "EXEC-002")).toBe(true);
    expect(findings.some((finding) => finding.ruleId === "ANOM-001")).toBe(true);
  });
});
