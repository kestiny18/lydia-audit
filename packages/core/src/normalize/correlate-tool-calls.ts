import type { AuditEvent } from "../schema/audit-event.js";
import type { ToolAuditOutcome, ToolAuditRecord } from "../schema/tool-audit-record.js";

const stringOrUndefined = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const numberOrUndefined = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

const booleanOrUndefined = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

export const correlateToolCalls = (events: AuditEvent[]): ToolAuditRecord[] => {
  const records = new Map<string, ToolAuditRecord>();

  for (const event of events) {
    const toolName = stringOrUndefined(event.payload.toolName) ?? "unknown";
    const existing = records.get(event.traceId);

    if (event.eventType === "tool_call.started") {
      records.set(event.traceId, {
        traceId: event.traceId,
        sessionId: event.sessionId,
        agentId: event.agentId,
        toolName,
        toolCategory: stringOrUndefined(event.payload.toolCategory),
        startedAt: event.timestamp,
        argumentsSummary: stringOrUndefined(event.payload.argumentsSummary) ?? "",
        outcome: "unknown",
        riskTags: stringArray(event.payload.riskTags),
        requiresApproval: booleanOrUndefined(event.payload.requiresApproval),
        approvalMode: stringOrUndefined(event.payload.approvalMode)
      });
      continue;
    }

    const outcome = (stringOrUndefined(event.payload.outcome) ?? "unknown") as ToolAuditOutcome;
    const merged: ToolAuditRecord = {
      traceId: event.traceId,
      sessionId: event.sessionId ?? existing?.sessionId,
      agentId: event.agentId ?? existing?.agentId,
      toolName,
      toolCategory: stringOrUndefined(event.payload.toolCategory) ?? existing?.toolCategory,
      startedAt: existing?.startedAt ?? event.timestamp,
      completedAt: event.timestamp,
      durationMs: numberOrUndefined(event.payload.durationMs),
      argumentsSummary: existing?.argumentsSummary ?? "",
      resultSummary: stringOrUndefined(event.payload.resultSummary),
      outcome,
      riskTags: Array.from(
        new Set([...stringArray(event.payload.riskTags), ...(existing?.riskTags ?? [])])
      ),
      requiresApproval: existing?.requiresApproval,
      approvalMode: existing?.approvalMode
    };

    records.set(event.traceId, merged);
  }

  return [...records.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
};
