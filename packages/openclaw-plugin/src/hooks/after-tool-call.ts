import type { AuditEvent, ToolCallCompletedPayload } from "@lydia/core";

import { redactValue } from "../redact/redact-value.js";
import { appendAuditEvent } from "../writers/jsonl-writer.js";
import { resolveAuditLogPath } from "../writers/path-resolver.js";
import { classifyToolRiskTags } from "./risk-tags.js";
import type { PluginRuntimeConfig, ToolResultContext } from "./types.js";

const timestampId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const summarizeResult = (value: unknown): string => {
  if (value === undefined) {
    return "(no result)";
  }
  if (typeof value === "string") {
    return value.length > 160 ? `${value.slice(0, 160)}...` : value;
  }
  return JSON.stringify(redactValue(value));
};

export const handleAfterToolCall = async (
  config: PluginRuntimeConfig,
  context: ToolResultContext
): Promise<AuditEvent> => {
  const timestamp = new Date().toISOString();
  const resultSummary = summarizeResult(context.result);
  const payload: ToolCallCompletedPayload = {
    toolName: context.toolName,
    outcome: context.outcome ?? "success",
    durationMs: context.startedAt
      ? new Date(timestamp).getTime() - new Date(context.startedAt).getTime()
      : undefined,
    resultSummary,
    resultSizeBytes: Buffer.byteLength(resultSummary, "utf8"),
    errorCode: context.errorCode,
    riskTags: classifyToolRiskTags(context.toolName, resultSummary)
  };

  const event: AuditEvent = {
    version: "1",
    eventId: timestampId(),
    eventType: "tool_call.completed",
    timestamp,
    source: "openclaw-plugin",
    workspaceId: context.workspaceId ?? config.workspaceId,
    sessionId: context.sessionId,
    agentId: context.agentId,
    traceId: context.traceId,
    payload
  };

  await appendAuditEvent(
    resolveAuditLogPath({
      baseDir: config.baseDir,
      workspaceId: event.workspaceId,
      date: new Date(timestamp)
    }),
    event
  );

  return event;
};
