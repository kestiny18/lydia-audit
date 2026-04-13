import type { Finding } from "../schema/finding.js";
import type { ToolAuditRecord } from "../schema/tool-audit-record.js";
import { scoreFindings, type AuditScore } from "./score-findings.js";

export type AuditSummary = {
  score: AuditScore;
  topFindings: Finding[];
  totalRecords: number;
  totalFindings: number;
};

export const createAuditSummary = (
  records: ToolAuditRecord[],
  findings: Finding[]
): AuditSummary => ({
  score: scoreFindings(findings),
  topFindings: findings.slice(0, 5),
  totalRecords: records.length,
  totalFindings: findings.length
});
