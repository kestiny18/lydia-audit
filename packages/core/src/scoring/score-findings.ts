import type { Finding } from "../schema/finding.js";
import { severityWeight } from "../rules/rule-types.js";

export type CategoryScore = {
  category: string;
  score: number;
  findings: number;
};

export type AuditScore = {
  overall: number;
  rating: "low" | "moderate" | "high" | "critical";
  categories: CategoryScore[];
};

const categoryFromRuleId = (ruleId: string): string => {
  if (ruleId.startsWith("EXEC")) return "execution";
  if (ruleId.startsWith("FS")) return "filesystem";
  if (ruleId.startsWith("NET")) return "network";
  if (ruleId.startsWith("APR")) return "approval";
  if (ruleId.startsWith("SC")) return "supply-chain";
  return "anomaly";
};

const ratingFromScore = (score: number): AuditScore["rating"] => {
  if (score >= 16) return "critical";
  if (score >= 10) return "high";
  if (score >= 5) return "moderate";
  return "low";
};

export const scoreFindings = (findings: Finding[]): AuditScore => {
  const byCategory = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const finding of findings) {
    const category = categoryFromRuleId(finding.ruleId);
    byCategory.set(category, (byCategory.get(category) ?? 0) + severityWeight[finding.severity]);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  const categories = [...byCategory.entries()].map(([category, score]) => ({
    category,
    score,
    findings: counts.get(category) ?? 0
  }));
  const overall = categories.reduce((sum, item) => sum + item.score, 0);

  return {
    overall,
    rating: ratingFromScore(overall),
    categories: categories.sort((a, b) => b.score - a.score)
  };
};
