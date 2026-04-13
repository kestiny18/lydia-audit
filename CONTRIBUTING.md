# Contributing

## Development

Install dependencies:

```bash
pnpm install
```

Build all packages:

```bash
pnpm build
```

Run the test suite:

```bash
pnpm test
```

## Project structure

- `packages/openclaw-plugin`: OpenClaw native plugin entry and hook handlers
- `packages/core`: audit schema, normalization, rules, scoring
- `packages/report-renderer`: Markdown and HTML report output
- `packages/cli`: local report generation command

## Contribution guidelines

- Keep changes focused and incremental
- Add or update tests for behavior changes
- Prefer local-first design and privacy-safe defaults
- Document user-facing behavior in `README.md` or `docs/`
