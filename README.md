# Lydia Audit

Lydia Audit is a local-first audit layer for agent runtimes. It starts with OpenClaw and focuses on one concrete problem: making tool-call behavior visible, reviewable, and safer to evolve.

[GitHub Repository](https://github.com/kestiny18/lydia-audit)

## What v1 does

- records `before_tool_call` and `after_tool_call` events
- stores redacted local JSONL audit logs
- correlates tool-call intent and outcomes
- classifies risky behavior
- generates Markdown, HTML, or JSON reports

## Quickstart

1. Install dependencies:

```bash
pnpm install
```

2. Build the workspace:

```bash
pnpm build
```

3. Run tests:

```bash
pnpm test
```

4. Generate a report from local audit logs:

```bash
node packages/cli/dist/index.js audit openclaw --input tests/fixtures/openclaw-audit --format markdown
```

## OpenClaw Demo

For a minimal local OpenClaw installation demo, see:

- `docs/openclaw-local-demo.md`
- `docs/openclaw-plugin-install.md`
- `docs/examples/openclaw-plugin-config.example.json`

## Packages

- `@lydia/openclaw-plugin`: captures OpenClaw tool-call audit events
- `@lydia/core`: schema, normalization, rules, scoring
- `@lydia/report-renderer`: Markdown and HTML report output
- `@lydia/cli`: user-facing audit command

## Why this exists

OpenClaw already provides a powerful runtime and important safety primitives. Lydia is meant to complement that runtime, not replace it.

The first release focuses on:

- local audit logging through native plugin hooks
- trace normalization for later analysis
- high-signal rule-based findings
- local report generation for ordinary users

Longer term, this audit stream can become the foundation for replay and change-gating.

## License

[MIT](./LICENSE)

## Current limitations

- v1 audits tool-call behavior only
- it does not block tool calls inline
- it does not replay sessions yet
- it relies on local log capture rather than a hosted service
