export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export type Finding = {
  id: string;
  ruleId: string;
  severity: FindingSeverity;
  title: string;
  summary: string;
  evidence: string[];
  recommendation: string;
  sessionId?: string;
  traceId?: string;
};

export const isFinding = (value: unknown): value is Finding => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const finding = value as Record<string, unknown>;

  return (
    typeof finding.id === "string" &&
    typeof finding.ruleId === "string" &&
    (finding.severity === "critical" ||
      finding.severity === "high" ||
      finding.severity === "medium" ||
      finding.severity === "low" ||
      finding.severity === "info") &&
    typeof finding.title === "string" &&
    typeof finding.summary === "string" &&
    Array.isArray(finding.evidence) &&
    typeof finding.recommendation === "string"
  );
};
