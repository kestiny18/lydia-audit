import type { FindingSeverity } from "../schema/finding.js";
import type { ToolAuditRecord } from "../schema/tool-audit-record.js";

export type RuleContext = {
  now?: Date;
  ignoredTools?: string[];
  highRiskTools?: string[];
  sensitivePathPatterns?: string[];
};

export type AuditRule = {
  id: string;
  evaluate: (records: ToolAuditRecord[], context: RuleContext) => import("../schema/finding.js").Finding[];
};

export const severityWeight: Record<FindingSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1
};
