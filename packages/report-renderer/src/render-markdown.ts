import type { AuditReportModel } from "./types.js";

export const renderMarkdown = (model: AuditReportModel): string => {
  const lines = [
    "# Lydia Audit Report",
    "",
    `Generated: ${model.generatedAt}`,
    `Source: ${model.sourcePath}`,
    "",
    "## Summary",
    "",
    `- Rating: ${model.summary.score.rating}`,
    `- Overall score: ${model.summary.score.overall}`,
    `- Records analyzed: ${model.summary.totalRecords}`,
    `- Findings: ${model.summary.totalFindings}`,
    "",
    "## Top Findings",
    ""
  ];

  for (const finding of model.findings) {
    lines.push(`### [${finding.severity.toUpperCase()}] ${finding.title}`);
    lines.push(finding.summary);
    lines.push(`Rule: ${finding.ruleId}`);
    lines.push(`Recommendation: ${finding.recommendation}`);
    if (finding.evidence.length > 0) {
      lines.push(`Evidence: ${finding.evidence.join("; ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
};
