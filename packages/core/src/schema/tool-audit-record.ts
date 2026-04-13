export type ToolAuditOutcome = "success" | "error" | "blocked" | "unknown";

export type ToolAuditRecord = {
  traceId: string;
  sessionId?: string;
  agentId?: string;
  toolName: string;
  toolCategory?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  argumentsSummary: string;
  resultSummary?: string;
  outcome: ToolAuditOutcome;
  riskTags: string[];
  requiresApproval?: boolean;
  approvalMode?: string;
};

export const isToolAuditRecord = (value: unknown): value is ToolAuditRecord => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.traceId === "string" &&
    typeof record.toolName === "string" &&
    typeof record.startedAt === "string" &&
    typeof record.argumentsSummary === "string" &&
    Array.isArray(record.riskTags) &&
    (record.outcome === "success" ||
      record.outcome === "error" ||
      record.outcome === "blocked" ||
      record.outcome === "unknown")
  );
};
