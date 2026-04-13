import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

import type { AuditEvent } from "@lydia/core";

export const appendAuditEvent = async (
  filePath: string,
  event: AuditEvent
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(event)}\n`, "utf8");
};
