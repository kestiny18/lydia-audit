import type { AuditReportModel } from "./types.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export const renderHtml = (model: AuditReportModel): string => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Lydia Audit Report</title>
    <style>
      body { font-family: Georgia, "Times New Roman", serif; margin: 40px; color: #1a1a1a; background: #f8f6ef; }
      .card { background: white; border: 1px solid #ddd4c5; padding: 16px; margin: 16px 0; border-radius: 10px; }
      .severity { font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; }
    </style>
  </head>
  <body>
    <h1>Lydia Audit Report</h1>
    <p>Generated: ${escapeHtml(model.generatedAt)}</p>
    <p>Source: ${escapeHtml(model.sourcePath)}</p>
    <div class="card">
      <h2>Summary</h2>
      <p>Rating: <strong>${escapeHtml(model.summary.score.rating)}</strong></p>
      <p>Overall score: ${model.summary.score.overall}</p>
      <p>Records analyzed: ${model.summary.totalRecords}</p>
      <p>Findings: ${model.summary.totalFindings}</p>
    </div>
    ${model.findings
      .map(
        (finding) => `
      <div class="card">
        <div class="severity">${escapeHtml(finding.severity)}</div>
        <h3>${escapeHtml(finding.title)}</h3>
        <p>${escapeHtml(finding.summary)}</p>
        <p><strong>Rule:</strong> ${escapeHtml(finding.ruleId)}</p>
        <p><strong>Recommendation:</strong> ${escapeHtml(finding.recommendation)}</p>
        <p><strong>Evidence:</strong> ${escapeHtml(finding.evidence.join("; "))}</p>
      </div>`
      )
      .join("\n")}
  </body>
</html>`.trim();
