import type { AuditSummary, Finding, ToolAuditRecord } from "@lydia/core";

export type AuditReportModel = {
  generatedAt: string;
  sourcePath: string;
  summary: AuditSummary;
  findings: Finding[];
  records: ToolAuditRecord[];
};
