import path from "node:path";
import { fileURLToPath } from "node:url";

import { auditOpenClaw } from "./commands/audit-openclaw.js";

export const cliPackage = "@lydia/cli";

export * from "./commands/audit-openclaw.js";
export * from "./config/load-config.js";

const parseArgs = (argv: string[]) => {
  const options: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
};

export const runCli = async (argv = process.argv.slice(2)): Promise<number> => {
  const [command, target] = argv;
  if (command !== "audit" || target !== "openclaw") {
    throw new Error('Usage: lydia audit openclaw --input <path> [--format markdown|html|json] [--output <path>] [--strict]');
  }

  const options = parseArgs(argv.slice(2));
  const inputPath = typeof options.input === "string" ? options.input : path.join(process.cwd(), ".lydia-audit", "openclaw");
  const format =
    options.format === "html" || options.format === "json" || options.format === "markdown"
      ? options.format
      : undefined;
  const result = await auditOpenClaw({
    inputPath,
    format,
    outputPath: typeof options.output === "string" ? options.output : undefined,
    strict: options.strict === true
  });

  process.stdout.write(`${result.output}\n`);
  return result.exitCode;
};

const isDirectExecution = (() => {
  const currentFile = fileURLToPath(import.meta.url);
  const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return currentFile === entry;
})();

if (isDirectExecution) {
  runCli().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  );
}
