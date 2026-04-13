export type AuditEventType = "tool_call.started" | "tool_call.completed";

export type ToolCallStartedPayload = {
  toolName: string;
  toolCategory?: string;
  argumentsSummary: string;
  argumentsPreview?: Record<string, unknown>;
  riskTags: string[];
  requiresApproval?: boolean;
  approvalMode?: string;
};

export type ToolCallCompletedPayload = {
  toolName: string;
  toolCategory?: string;
  outcome: "success" | "error" | "blocked";
  durationMs?: number;
  resultSummary: string;
  resultSizeBytes?: number;
  errorCode?: string;
  riskTags: string[];
};

export type AuditEvent = {
  version: "1";
  eventId: string;
  eventType: AuditEventType;
  timestamp: string;
  source: "openclaw-plugin";
  workspaceId?: string;
  sessionId?: string;
  agentId?: string;
  traceId: string;
  payload: Record<string, unknown>;
};

export const isAuditEvent = (value: unknown): value is AuditEvent => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    record.version === "1" &&
    typeof record.eventId === "string" &&
    (record.eventType === "tool_call.started" ||
      record.eventType === "tool_call.completed") &&
    typeof record.timestamp === "string" &&
    record.source === "openclaw-plugin" &&
    typeof record.traceId === "string" &&
    typeof record.payload === "object" &&
    record.payload !== null
  );
};
