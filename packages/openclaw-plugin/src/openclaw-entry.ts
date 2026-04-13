import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

import { handleAfterToolCall } from "./hooks/after-tool-call.js";
import { handleBeforeToolCall } from "./hooks/before-tool-call.js";
import { classifyToolRiskTags } from "./hooks/risk-tags.js";
import { resolveLydiaOpenClawPluginConfig, lydiaOpenClawPluginConfigSchema } from "./openclaw-config.js";

type TraceState = {
  traceId: string;
  startedAt: string;
};

type CorrelationEvent = {
  toolCallId?: string;
  runId?: string;
  toolName: string;
};

type CorrelationContext = {
  sessionId?: string;
  sessionKey?: string;
};

const correlationKey = (
  event: CorrelationEvent,
  ctx: CorrelationContext
): string => event.toolCallId ?? `${ctx.sessionId ?? ctx.sessionKey ?? "session"}:${event.runId ?? "run"}:${event.toolName}`;

const buildApprovalRequest = (toolName: string, riskTags: string[]) => ({
  title: `Approve ${toolName}`,
  description: `Lydia flagged this tool call as high risk (${riskTags.join(", ")}).`,
  severity: "warning" as const,
  timeoutMs: 60_000,
  timeoutBehavior: "deny" as const,
  pluginId: "@lydia/openclaw-plugin"
});

export default definePluginEntry({
  id: "@lydia/openclaw-plugin",
  name: "Lydia Tool Audit",
  description: "Audits OpenClaw tool calls through native plugin hooks and writes local audit logs.",
  configSchema: lydiaOpenClawPluginConfigSchema,
  register(api) {
    const traces = new Map<string, TraceState>();

    api.on("before_tool_call", async (event, ctx) => {
      const pluginConfig = resolveLydiaOpenClawPluginConfig(api.pluginConfig);
      const startedAt = new Date().toISOString();
      const key = correlationKey(event, ctx);
      const auditEvent = await handleBeforeToolCall(pluginConfig, {
        toolName: event.toolName,
        sessionId: ctx.sessionId,
        agentId: ctx.agentId,
        workspaceId: pluginConfig.workspaceId ?? ctx.sessionKey ?? ctx.sessionId,
        arguments: event.params,
        startedAt
      });

      traces.set(key, {
        traceId: auditEvent.traceId,
        startedAt
      });

      const riskTags = classifyToolRiskTags(event.toolName, auditEvent.payload.argumentsSummary as string);
      if (!pluginConfig.enforceApprovals || !(riskTags.includes("execution") || riskTags.includes("supply-chain"))) {
        return;
      }

      return {
        requireApproval: buildApprovalRequest(event.toolName, riskTags)
      };
    });

    api.on("after_tool_call", async (event, ctx) => {
      const pluginConfig = resolveLydiaOpenClawPluginConfig(api.pluginConfig);
      const key = correlationKey(event, ctx);
      const trace = traces.get(key);

      await handleAfterToolCall(pluginConfig, {
        toolName: event.toolName,
        sessionId: ctx.sessionId,
        agentId: ctx.agentId,
        workspaceId: pluginConfig.workspaceId ?? ctx.sessionKey ?? ctx.sessionId,
        traceId: trace?.traceId ?? key,
        startedAt: trace?.startedAt,
        result: event.result,
        outcome: event.error ? "error" : "success",
        errorCode: event.error
      });

      traces.delete(key);
    });

    api.logger.info("Lydia Tool Audit plugin registered.");
  }
});
