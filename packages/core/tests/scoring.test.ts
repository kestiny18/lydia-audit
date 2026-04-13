import { describe, expect, it } from "vitest";

import { createAuditSummary, scoreFindings, type Finding, type ToolAuditRecord } from "../src/index.js";

describe("scoring", () => {
  it("produces stable category scores and rating", () => {
    const findings: Finding[] = [
      {
        id: "1",
        ruleId: "APR-001",
        severity: "critical",
        title: "a",
        summary: "b",
        evidence: [],
        recommendation: "c"
      },
      {
        id: "2",
        ruleId: "EXEC-001",
        severity: "high",
        title: "a",
        summary: "b",
        evidence: [],
        recommendation: "c"
      }
    ];
    const score = scoreFindings(findings);
    expect(score.overall).toBeGreaterThan(0);
    expect(score.rating).toBe("moderate");
  });

  it("builds a summary with top findings", () => {
    const records: ToolAuditRecord[] = [];
    const findings: Finding[] = [
      {
        id: "1",
        ruleId: "APR-001",
        severity: "critical",
        title: "a",
        summary: "b",
        evidence: [],
        recommendation: "c"
      }
    ];
    expect(createAuditSummary(records, findings).topFindings).toHaveLength(1);
  });
});
