import { describe, expect, it } from "vitest";

import type { AuditReportModel } from "../src/index.js";
import { renderHtml, renderMarkdown } from "../src/index.js";

const model: AuditReportModel = {
  generatedAt: "2026-04-14T00:00:00.000Z",
  sourcePath: "fixtures",
  summary: {
    score: {
      overall: 9,
      rating: "moderate",
      categories: []
    },
    topFindings: [],
    totalRecords: 3,
    totalFindings: 1
  },
  records: [],
  findings: [
    {
      id: "1",
      ruleId: "EXEC-001",
      severity: "high",
      title: "Execution-capable tool invoked",
      summary: "Tool exec can execute commands.",
      evidence: ["tool=exec"],
      recommendation: "Require approval."
    }
  ]
};

describe("renderers", () => {
  it("renders markdown output", () => {
    expect(renderMarkdown(model)).toContain("# Lydia Audit Report");
    expect(renderMarkdown(model)).toContain("Execution-capable tool invoked");
  });

  it("renders html output", () => {
    expect(renderHtml(model)).toContain("<html");
    expect(renderHtml(model)).toContain("Execution-capable tool invoked");
  });
});
