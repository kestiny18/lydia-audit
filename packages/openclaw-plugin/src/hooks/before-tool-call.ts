import type { AuditEvent, ToolCallStartedPayload } from "@lydia/core";

import { summarizeArgs } from "../redact/summarize-args.js";
import { appendAuditEvent } from "../writers/jsonl-writer.js";
import { resolveAuditLogPath } from "../writers/path-resolver.js";
import { classifyToolRiskTags } from "./risk-tags.js";
import type { PluginRuntimeConfig, ToolCallContext } from "./types.js";

const timestampId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const handleBeforeToolCall = async (
  config: PluginRuntimeConfig,
  context: ToolCallContext
): Promise<AuditEvent> => {
  const { summary, preview } = summarizeArgs(context.arguments ?? {});
  const riskTags = classifyToolRiskTags(context.toolName, summary);
  const traceId = context.traceId ?? timestampId();
  const timestamp = context.startedAt ?? new Date().toISOString();
  const payload: ToolCallStartedPayload = {
    toolName: context.toolName,
    argumentsSummary: summary,
    argumentsPreview: preview,
    riskTags,
    requiresApproval: context.requiresApproval,
    approvalMode: context.approvalMode
  };

  const event: AuditEvent = {
    version: "1",
    eventId: timestampId(),
    eventType: "tool_call.started",
    timestamp,
    source: "openclaw-plugin",
    workspaceId: context.workspaceId ?? config.workspaceId,
    sessionId: context.sessionId,
    agentId: context.agentId,
    traceId,
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
