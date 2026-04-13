export type ToolCallContext = {
  toolName: string;
  sessionId?: string;
  agentId?: string;
  workspaceId?: string;
  traceId?: string;
  arguments?: Record<string, unknown>;
  requiresApproval?: boolean;
  approvalMode?: string;
  startedAt?: string;
};

export type ToolResultContext = {
  toolName: string;
  sessionId?: string;
  agentId?: string;
  workspaceId?: string;
  traceId: string;
  startedAt?: string;
  result?: unknown;
  outcome?: "success" | "error" | "blocked";
  errorCode?: string;
};

export type PluginRuntimeConfig = {
  baseDir: string;
  workspaceId?: string;
};
