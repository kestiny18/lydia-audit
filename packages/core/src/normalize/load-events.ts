import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { isAuditEvent, type AuditEvent } from "../schema/audit-event.js";

const collectJsonlFiles = async (inputPath: string): Promise<string[]> => {
  const stat = await readdir(inputPath, { withFileTypes: true }).catch(() => null);

  if (stat === null) {
    return [inputPath];
  }

  const files: string[] = [];

  for (const entry of stat) {
    const fullPath = path.join(inputPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJsonlFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".jsonl")) {
      files.push(fullPath);
    }
  }

  return files.sort();
};

export const loadAuditEvents = async (inputPath: string): Promise<AuditEvent[]> => {
  const files = await collectJsonlFiles(inputPath);
  const events: AuditEvent[] = [];

  for (const filePath of files) {
    const contents = await readFile(filePath, "utf8");
    const lines = contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const parsed = JSON.parse(line) as unknown;
      if (isAuditEvent(parsed)) {
        events.push(parsed);
      }
    }
  }

  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};
