import { readFile } from "node:fs/promises";
import path from "node:path";

import type { RuleContext } from "@lydia/core";

export type LydiaAuditConfig = RuleContext & {
  defaultReportFormat?: "markdown" | "html" | "json";
};

export const loadConfig = async (cwd: string): Promise<LydiaAuditConfig> => {
  const configPath = path.join(cwd, "lydia.audit.json");
  try {
    const contents = await readFile(configPath, "utf8");
    return JSON.parse(contents) as LydiaAuditConfig;
  } catch {
    return {};
  }
};
