import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  correlateToolCalls,
  createAuditSummary,
  evaluateRules,
  loadAuditEvents
} from "@lydia/core";
import { renderHtml, renderMarkdown, type AuditReportModel } from "@lydia/report-renderer";

import { loadConfig } from "../config/load-config.js";

export type AuditOpenClawOptions = {
  inputPath: string;
  cwd?: string;
  format?: "markdown" | "html" | "json";
  outputPath?: string;
  strict?: boolean;
};

export type AuditCommandResult = {
  output: string;
  report: AuditReportModel;
  exitCode: number;
};

export const auditOpenClaw = async ({
  inputPath,
  cwd = process.cwd(),
  format,
  outputPath,
  strict = false
}: AuditOpenClawOptions): Promise<AuditCommandResult> => {
  const config = await loadConfig(cwd);
  const events = await loadAuditEvents(inputPath);
  const records = correlateToolCalls(events);
  const findings = evaluateRules(records, config);
  const summary = createAuditSummary(records, findings);

  const report: AuditReportModel = {
    generatedAt: new Date().toISOString(),
    sourcePath: inputPath,
    summary,
    findings,
    records
  };

  const resolvedFormat = format ?? config.defaultReportFormat ?? "markdown";
  const output =
    resolvedFormat === "html"
      ? renderHtml(report)
      : resolvedFormat === "json"
        ? JSON.stringify(report, null, 2)
        : renderMarkdown(report);

  if (outputPath) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output, "utf8");
  }

  const exitCode =
    strict && findings.some((finding) => finding.severity === "critical" || finding.severity === "high")
      ? 1
      : 0;

  return {
    output,
    report,
    exitCode
  };
};
