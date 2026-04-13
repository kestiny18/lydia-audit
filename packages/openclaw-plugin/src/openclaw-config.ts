import os from "node:os";
import path from "node:path";

import type { OpenClawPluginConfigSchema } from "openclaw/plugin-sdk/plugin-entry";

import type { PluginRuntimeConfig } from "./hooks/types.js";

export type LydiaOpenClawPluginConfig = PluginRuntimeConfig & {
  enforceApprovals: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const lydiaOpenClawPluginConfigSchema: OpenClawPluginConfigSchema = {
  validate(value) {
    if (value === undefined) {
      return { ok: true, value: undefined };
    }

    if (!isRecord(value)) {
      return { ok: false, errors: ["plugin config must be an object"] };
    }

    const errors: string[] = [];
    if ("baseDir" in value && typeof value.baseDir !== "string") {
      errors.push("baseDir must be a string");
    }
    if ("workspaceId" in value && typeof value.workspaceId !== "string") {
      errors.push("workspaceId must be a string");
    }
    if ("enforceApprovals" in value && typeof value.enforceApprovals !== "boolean") {
      errors.push("enforceApprovals must be a boolean");
    }

    if (errors.length > 0) {
      return { ok: false, errors };
    }

    return { ok: true, value };
  },
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      baseDir: { type: "string", description: "Directory where Lydia audit logs are stored." },
      workspaceId: { type: "string", description: "Optional logical workspace id for log partitioning." },
      enforceApprovals: {
        type: "boolean",
        description: "If true, Lydia requests approval for high-risk tool calls."
      }
    }
  },
  uiHints: {
    baseDir: {
      label: "Audit Log Directory",
      help: "Local directory where Lydia writes JSONL tool-audit logs."
    },
    workspaceId: {
      label: "Workspace Id",
      help: "Optional stable workspace identifier used in log paths."
    },
    enforceApprovals: {
      label: "Require Approvals",
      help: "Ask for approval before high-risk execution or supply-chain tool calls."
    }
  }
};

export const resolveLydiaOpenClawPluginConfig = (
  pluginConfig?: Record<string, unknown>
): LydiaOpenClawPluginConfig => ({
  baseDir:
    typeof pluginConfig?.baseDir === "string"
      ? pluginConfig.baseDir
      : path.join(os.homedir(), ".lydia-audit", "openclaw"),
  workspaceId: typeof pluginConfig?.workspaceId === "string" ? pluginConfig.workspaceId : undefined,
  enforceApprovals: pluginConfig?.enforceApprovals === true
});
