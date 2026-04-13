import path from "node:path";

type AuditPathOptions = {
  baseDir: string;
  workspaceId?: string;
  date?: Date;
};

export const sanitizePathSegment = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]/g, "_");

export const resolveAuditLogPath = ({
  baseDir,
  workspaceId = "default-workspace",
  date = new Date()
}: AuditPathOptions): string => {
  const safeWorkspaceId = sanitizePathSegment(workspaceId);
  const fileName = `${date.toISOString().slice(0, 10)}.jsonl`;

  return path.join(baseDir, safeWorkspaceId, fileName);
};
