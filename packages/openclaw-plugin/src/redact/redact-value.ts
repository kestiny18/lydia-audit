const SECRET_KEY_PATTERN = /(token|secret|password|api[-_]?key|authorization)/i;

const truncate = (value: string, maxLength = 120): string =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

const redactString = (value: string): string => {
  if (value.length > 24 && /[A-Za-z0-9_\-]{20,}/.test(value)) {
    return "[REDACTED]";
  }

  return truncate(value);
};

export const redactValue = (value: unknown, keyHint?: string): unknown => {
  if (typeof keyHint === "string" && SECRET_KEY_PATTERN.test(keyHint)) {
    return "[REDACTED]";
  }

  if (typeof value === "string") {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => redactValue(item));
  }

  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      result[key] = redactValue(nestedValue, key);
    }
    return result;
  }

  return value;
};
