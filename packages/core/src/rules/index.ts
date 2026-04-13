import type { Finding } from "../schema/finding.js";
import type { ToolAuditRecord } from "../schema/tool-audit-record.js";
import type { AuditRule, RuleContext } from "./rule-types.js";

const asNeedleList = (patterns: string[] | undefined): string[] => (patterns ?? []).map((p) => p.toLowerCase());

const includesAny = (value: string | undefined, patterns: string[]): boolean => {
  if (!value) {
    return false;
  }
  const haystack = value.toLowerCase();
  return patterns.some((pattern) => haystack.includes(pattern));
};

const highRiskToolNames = (context: RuleContext): string[] =>
  asNeedleList(context.highRiskTools ?? ["exec", "shell", "terminal", "install_package", "run_command"]);

const sensitivePathPatterns = (context: RuleContext): string[] =>
  asNeedleList(context.sensitivePathPatterns ?? [".ssh", ".env", "secrets", "id_rsa", "credentials"]);

const createFinding = (
  ruleId: string,
  severity: Finding["severity"],
  record: ToolAuditRecord,
  title: string,
  summary: string,
  recommendation: string,
  evidence: string[]
): Finding => ({
  id: `${ruleId.toLowerCase()}-${record.traceId}`,
  ruleId,
  severity,
  title,
  summary,
  recommendation,
  evidence,
  sessionId: record.sessionId,
  traceId: record.traceId
});

const ruleExec001: AuditRule = {
  id: "EXEC-001",
  evaluate(records, context) {
    const risky = highRiskToolNames(context);
    return records
      .filter((record) => risky.includes(record.toolName.toLowerCase()) || record.riskTags.includes("execution"))
      .map((record) =>
        createFinding(
          "EXEC-001",
          "high",
          record,
          "Execution-capable tool invoked",
          `Tool "${record.toolName}" can execute commands or code.`,
          "Require strong approval and review execution-capable tools before allowing runtime use.",
          [`tool=${record.toolName}`, `args=${record.argumentsSummary}`]
        )
      );
  }
};

const ruleExec002: AuditRule = {
  id: "EXEC-002",
  evaluate(records, context) {
    const risky = highRiskToolNames(context);
    const findings: Finding[] = [];
    const grouped = new Map<string, ToolAuditRecord[]>();
    for (const record of records) {
      if (!(risky.includes(record.toolName.toLowerCase()) || record.riskTags.includes("execution"))) {
        continue;
      }
      const key = record.sessionId ?? "global";
      grouped.set(key, [...(grouped.get(key) ?? []), record]);
    }
    for (const items of grouped.values()) {
      const failing = items.filter((record) => record.outcome === "error");
      if (failing.length >= 2) {
        const record = failing[failing.length - 1];
        findings.push(
          createFinding(
            "EXEC-002",
            "medium",
            record,
            "Repeated execution failures detected",
            `${failing.length} execution-capable tool calls failed in the same session.`,
            "Inspect the workflow for loops, unstable prompts, or missing preconditions before retrying execution tools.",
            failing.map((item) => `${item.toolName}:${item.outcome}`)
          )
        );
      }
    }
    return findings;
  }
};

const ruleFs001: AuditRule = {
  id: "FS-001",
  evaluate(records, context) {
    const patterns = sensitivePathPatterns(context);
    return records
      .filter(
        (record) =>
          record.riskTags.includes("filesystem") &&
          includesAny(record.argumentsSummary, patterns)
      )
      .map((record) =>
        createFinding(
          "FS-001",
          "high",
          record,
          "Sensitive filesystem path targeted",
          "A filesystem-capable tool appears to access a sensitive path.",
          "Tighten path scopes and require approval for access to sensitive directories and secrets.",
          [`tool=${record.toolName}`, `args=${record.argumentsSummary}`]
        )
      );
  }
};

const ruleNet001: AuditRule = {
  id: "NET-001",
  evaluate(records) {
    return records
      .filter((record) => record.riskTags.includes("network"))
      .map((record) =>
        createFinding(
          "NET-001",
          "medium",
          record,
          "Network-capable tool used",
          `Tool "${record.toolName}" used network-capable behavior.`,
          "Confirm the workflow truly needs network access and prefer explicit allowlists.",
          [`tool=${record.toolName}`, `args=${record.argumentsSummary}`]
        )
      );
  }
};

const ruleApr001: AuditRule = {
  id: "APR-001",
  evaluate(records, context) {
    const risky = highRiskToolNames(context);
    return records
      .filter(
        (record) =>
          (risky.includes(record.toolName.toLowerCase()) || record.riskTags.includes("execution")) &&
          record.requiresApproval !== true
      )
      .map((record) =>
        createFinding(
          "APR-001",
          "critical",
          record,
          "High-risk tool lacks strong approval metadata",
          `High-risk tool "${record.toolName}" did not carry approval metadata.`,
          "Require explicit approval metadata and stronger execution gates for high-risk tools.",
          [`tool=${record.toolName}`, `approval=${String(record.requiresApproval)}`]
        )
      );
  }
};

const ruleApr002: AuditRule = {
  id: "APR-002",
  evaluate(records, context) {
    const risky = highRiskToolNames(context);
    const findings: Finding[] = [];
    const grouped = new Map<string, ToolAuditRecord[]>();
    for (const record of records) {
      if (!(risky.includes(record.toolName.toLowerCase()) || record.riskTags.includes("execution"))) {
        continue;
      }
      const key = `${record.sessionId ?? "global"}:${record.toolName}`;
      grouped.set(key, [...(grouped.get(key) ?? []), record]);
    }
    for (const items of grouped.values()) {
      const blockedOrError = items.filter((item) => item.outcome === "blocked" || item.outcome === "error");
      if (blockedOrError.length >= 2) {
        const record = blockedOrError[blockedOrError.length - 1];
        findings.push(
          createFinding(
            "APR-002",
            "medium",
            record,
            "Risky tool invoked repeatedly after denial or failure",
            `Tool "${record.toolName}" was retried after blocked or failed outcomes.`,
            "Investigate approval loops and add cooldown or retry caps for risky tools.",
            blockedOrError.map((item) => `${item.outcome}@${item.startedAt}`)
          )
        );
      }
    }
    return findings;
  }
};

const ruleAnom001: AuditRule = {
  id: "ANOM-001",
  evaluate(records) {
    const findings: Finding[] = [];
    const grouped = new Map<string, ToolAuditRecord[]>();
    for (const record of records) {
      const key = `${record.sessionId ?? "global"}:${record.toolName}`;
      grouped.set(key, [...(grouped.get(key) ?? []), record]);
    }
    for (const items of grouped.values()) {
      if (items.length >= 4) {
        const first = new Date(items[0].startedAt).getTime();
        const last = new Date(items[items.length - 1].startedAt).getTime();
        if (last - first <= 5 * 60 * 1000) {
          const record = items[items.length - 1];
          findings.push(
            createFinding(
              "ANOM-001",
              "low",
              record,
              "Unusually frequent tool activity",
              `Tool "${record.toolName}" was called ${items.length} times within a short time window.`,
              "Review for loops, missing stop conditions, or unstable retry behavior.",
              items.map((item) => item.startedAt)
            )
          );
        }
      }
    }
    return findings;
  }
};

const ruleAnom002: AuditRule = {
  id: "ANOM-002",
  evaluate(records) {
    return records
      .filter((record) => record.outcome === "unknown")
      .map((record) =>
        createFinding(
          "ANOM-002",
          "low",
          record,
          "Incomplete tool-call correlation",
          `Tool "${record.toolName}" has a start event without a completed outcome.`,
          "Inspect plugin logging and runtime shutdown behavior to reduce dropped audit events.",
          [`traceId=${record.traceId}`]
        )
      );
  }
};

const ruleSc001: AuditRule = {
  id: "SC-001",
  evaluate(records) {
    const patterns = ["npm install", "pnpm add", "pip install", "curl ", "wget "];
    return records
      .filter((record) => includesAny(record.argumentsSummary, patterns))
      .map((record) =>
        createFinding(
          "SC-001",
          "high",
          record,
          "Runtime install or download behavior detected",
          "The agent appears to install packages or download remote content during execution.",
          "Treat runtime installation and downloads as supply-chain sensitive and require explicit review.",
          [`args=${record.argumentsSummary}`]
        )
      );
  }
};

const ruleSc002: AuditRule = {
  id: "SC-002",
  evaluate(records) {
    const patterns = ["rm -rf", "remove-item -recurse", "chmod 777", "invoke-webrequest", "curl http", "wget http"];
    return records
      .filter((record) => includesAny(record.argumentsSummary, patterns))
      .map((record) =>
        createFinding(
          "SC-002",
          "critical",
          record,
          "Dangerous command pattern detected",
          "Tool arguments match a dangerous execution or download pattern.",
          "Block or strictly gate this pattern unless a human has explicitly approved it.",
          [`args=${record.argumentsSummary}`]
        )
      );
  }
};

export const defaultRules: AuditRule[] = [
  ruleExec001,
  ruleExec002,
  ruleFs001,
  ruleNet001,
  ruleApr001,
  ruleApr002,
  ruleAnom001,
  ruleAnom002,
  ruleSc001,
  ruleSc002
];

export const evaluateRules = (
  records: ToolAuditRecord[],
  context: RuleContext = {},
  rules: AuditRule[] = defaultRules
): Finding[] =>
  rules
    .flatMap((rule) => rule.evaluate(records, context))
    .sort((a, b) => {
      const severityOrder = ["critical", "high", "medium", "low", "info"];
      return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
    });
