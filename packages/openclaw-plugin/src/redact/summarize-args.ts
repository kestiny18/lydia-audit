import { redactValue } from "./redact-value.js";

export type ArgumentSummary = {
  summary: string;
  preview: Record<string, unknown>;
};

export const summarizeArgs = (value: unknown): ArgumentSummary => {
  if (typeof value !== "object" || value === null) {
    return {
      summary: String(redactValue(value)),
      preview: {}
    };
  }

  const preview = redactValue(value) as Record<string, unknown>;
  const summary = Object.entries(preview)
    .slice(0, 4)
    .map(([key, item]) => `${key}=${typeof item === "string" ? item : JSON.stringify(item)}`)
    .join(", ");

  return {
    summary: summary || "(no arguments)",
    preview
  };
};
