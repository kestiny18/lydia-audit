const includesAny = (value: string, needles: string[]): boolean =>
  needles.some((needle) => value.includes(needle));

export const classifyToolRiskTags = (toolName: string, argumentsSummary = ""): string[] => {
  const haystack = `${toolName} ${argumentsSummary}`.toLowerCase();
  const tags = new Set<string>();

  if (includesAny(haystack, ["exec", "shell", "terminal", "command", "powershell", "bash"])) {
    tags.add("execution");
  }

  if (includesAny(haystack, ["file", "write", "read", "path", ".env", ".ssh", "secrets"])) {
    tags.add("filesystem");
  }

  if (includesAny(haystack, ["http", "https", "curl", "wget", "fetch", "download"])) {
    tags.add("network");
  }

  if (includesAny(haystack, ["install", "npm", "pnpm", "pip", "package"])) {
    tags.add("supply-chain");
  }

  if (tags.size === 0) {
    tags.add("general");
  }

  return [...tags];
};
