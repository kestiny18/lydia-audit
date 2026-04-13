# Lydia Tool Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `Lydia Tool Audit`, an OpenClaw plugin-powered local audit feature that records `before_tool_call` and `after_tool_call` events, classifies risky tool usage, and generates actionable local audit reports for ordinary OpenClaw users.

**Architecture:** Lydia v1 is split into two parts: an OpenClaw plugin that captures runtime tool-call audit events, and a local CLI/reporting pipeline that normalizes those events into findings and reports. The design is intentionally narrow: tool-call behavior first, broader replay/policy gate later.

**Tech Stack:** TypeScript, Node.js, OpenClaw Plugin SDK, JSONL event logs, Markdown/HTML report generation, Vitest, pnpm

---

## 1. Product Summary

### Problem

OpenClaw users can give agents substantial local power, but most ordinary users cannot answer these questions confidently:

- Which tools does my agent actually invoke?
- Which invocations are high-risk?
- Which calls bypassed strong approval or looked suspicious?
- Which plugin or workflow introduced the risky behavior?

OpenClaw already offers runtime power and safety primitives. Lydia should not compete with that runtime. Instead, Lydia should provide an independent audit layer that helps users understand and review real tool behavior.

### Product Position

`Lydia Tool Audit` is a local audit plugin plus reporting CLI for OpenClaw.

It does:

- capture tool-call intent and outcome
- normalize events into a stable audit schema
- classify risky behavior
- generate local reports with evidence and remediation advice

It does not do in v1:

- block tool calls inline
- replace OpenClaw approvals
- replay sessions
- analyze all model reasoning
- provide cloud dashboards

### Primary Users

1. Ordinary OpenClaw users who want a quick safety check
2. Advanced local users who install skills, hooks, and plugins
3. Small teams running OpenClaw in real internal workflows

### Core Value Proposition

`See what your agent actually did, which tool calls were risky, and what to tighten next.`

---

## 2. v1 Scope

### In Scope

- OpenClaw plugin integration using `before_tool_call` and `after_tool_call`
- Stable local audit event capture
- JSONL audit log storage
- Tool risk tagging and rule-based finding generation
- Local CLI that reads audit logs and emits Markdown/HTML/JSON reports
- Basic configuration for severity thresholds and ignored tools

### Out of Scope

- full OpenClaw policy parsing beyond minimal metadata
- cross-framework ingestion
- remote storage and SaaS accounts
- inline enforcement or hard blocks
- branching, replay, or rollout cooldowns
- enterprise compliance exports

### v1 Success Criteria

1. A user can install the plugin and generate a report in under 10 minutes.
2. Lydia reliably captures tool name, arguments summary, outcome, and timing.
3. Lydia produces understandable findings for obviously risky behaviors.
4. A user can act on at least one concrete tightening recommendation after reading the report.

---

## 3. System Architecture

### High-Level Components

1. `packages/openclaw-plugin`
OpenClaw plugin that receives `before_tool_call` and `after_tool_call` hooks and writes audit events.

2. `packages/core`
Shared schema, normalization, risk classification, rule engine, report models.

3. `packages/cli`
User-facing CLI for scanning logs and generating reports.

4. `packages/report-renderer`
Transforms findings into Markdown and HTML output.

### Data Flow

1. OpenClaw starts and loads Lydia plugin
2. `before_tool_call` receives tool name and input payload
3. Plugin emits a `tool_call.started` audit event
4. `after_tool_call` receives result metadata
5. Plugin emits a `tool_call.completed` audit event
6. Events are appended to a local JSONL file
7. CLI loads events, correlates start/end pairs, normalizes records
8. Rule engine evaluates correlated tool-call records
9. Reporter writes Markdown, HTML, and optional JSON findings

### Storage Strategy

Use local append-only JSONL files.

Recommended path:

`~/.lydia-audit/openclaw/<workspace-or-profile>/<date>.jsonl`

Benefits:

- easy to inspect manually
- resilient to partial writes
- simple for later replay features
- no external database needed

### Why Hooks First

The plugin-hook path is the fastest viable slice because it provides real runtime behavior evidence without requiring OpenClaw core changes. It also creates a reusable event stream that later phases can feed into replay and gate features.

---

## 4. Audit Event Schema

### Event Envelope

Every stored event should share a common envelope:

```ts
type AuditEvent = {
  version: "1";
  eventId: string;
  eventType: "tool_call.started" | "tool_call.completed";
  timestamp: string;
  source: "openclaw-plugin";
  workspaceId?: string;
  sessionId?: string;
  agentId?: string;
  traceId: string;
  payload: Record<string, unknown>;
};
```

### `tool_call.started` Payload

```ts
type ToolCallStartedPayload = {
  toolName: string;
  toolCategory?: string;
  argumentsSummary: string;
  argumentsPreview?: Record<string, unknown>;
  riskTags: string[];
  requiresApproval?: boolean;
  approvalMode?: string;
};
```

### `tool_call.completed` Payload

```ts
type ToolCallCompletedPayload = {
  toolName: string;
  outcome: "success" | "error" | "blocked";
  durationMs?: number;
  resultSummary: string;
  resultSizeBytes?: number;
  errorCode?: string;
  riskTags: string[];
};
```

### Correlated Record for Rules

```ts
type ToolAuditRecord = {
  traceId: string;
  sessionId?: string;
  agentId?: string;
  toolName: string;
  toolCategory?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  argumentsSummary: string;
  resultSummary?: string;
  outcome: "success" | "error" | "blocked" | "unknown";
  riskTags: string[];
  requiresApproval?: boolean;
  approvalMode?: string;
};
```

### Privacy and Redaction Rules

Do not store raw secrets, full file contents, or large command outputs by default.

v1 redaction rules:

- truncate long arguments and results
- hash likely secret values when detected
- record file paths, not file contents
- record command summaries, not full terminal transcripts unless explicitly enabled

---

## 5. Risk Model and Rule Engine

### Risk Categories

1. `execution`
2. `filesystem`
3. `network`
4. `supply-chain`
5. `approval`
6. `anomaly`

### Severity Levels

1. `critical`
2. `high`
3. `medium`
4. `low`
5. `info`

### Initial v1 Rules

1. `EXEC-001`
High-risk command execution tool invoked.

2. `EXEC-002`
Repeated execution failures suggest looping or unstable agent behavior.

3. `FS-001`
Filesystem write tool invoked against broad or sensitive paths.

4. `NET-001`
Network-capable tool used in a workflow not expected to need network access.

5. `APR-001`
High-risk tool call appears without strong approval metadata.

6. `APR-002`
High-risk tool invoked repeatedly after prior denial or failure.

7. `ANOM-001`
Tool called unusually often within a short time window.

8. `ANOM-002`
Mismatch between started and completed events indicates dropped or untracked calls.

9. `SC-001`
Install or package-management style tool invoked at runtime.

10. `SC-002`
Tool arguments match known dangerous patterns such as recursive deletes or broad shell access.

### Finding Shape

```ts
type Finding = {
  id: string;
  ruleId: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  summary: string;
  evidence: string[];
  recommendation: string;
  sessionId?: string;
  traceId?: string;
};
```

---

## 6. CLI UX

### Primary Commands

```bash
lydia audit openclaw
lydia audit openclaw --input ~/.lydia-audit/openclaw
lydia audit openclaw --last 20
lydia audit openclaw --format markdown
lydia audit openclaw --format html
lydia audit openclaw --format json
lydia audit openclaw --strict
```

### Configuration

File:

`lydia.audit.json`

Example:

```json
{
  "ignoredTools": ["read_file"],
  "sensitivePathPatterns": ["~/.ssh", ".env", "secrets"],
  "highRiskTools": ["exec", "shell", "install_package"],
  "defaultReportFormat": "html"
}
```

### Report Sections

1. Executive summary
2. Risk score by category
3. Top findings
4. Timeline of notable tool calls
5. Evidence table
6. Recommended fixes
7. Audit metadata

---

## 7. Repository Layout

Recommended repository structure:

```text
docs/
  plans/
packages/
  cli/
    src/
    tests/
  core/
    src/
      schema/
      normalize/
      rules/
      scoring/
    tests/
  openclaw-plugin/
    src/
      hooks/
      writers/
      redact/
    tests/
  report-renderer/
    src/
    tests/
pnpm-workspace.yaml
package.json
tsconfig.base.json
vitest.config.ts
README.md
```

---

## 8. Implementation Phases

### Phase 0: Foundation

Objective: bootstrap a monorepo and define contracts before writing logic.

Deliverables:

- workspace package setup
- shared TypeScript config
- shared schema package
- basic lint/test/build scripts

### Phase 1: Plugin Event Capture

Objective: prove that Lydia can capture tool-call events from OpenClaw hooks.

Deliverables:

- plugin entrypoint
- `before_tool_call` handler
- `after_tool_call` handler
- JSONL writer
- correlation identifiers
- basic redaction layer

### Phase 2: Normalization and Rules

Objective: transform raw events into audit records and findings.

Deliverables:

- event loader
- correlator
- rule engine
- initial 10 rules
- severity scoring

### Phase 3: Reporting

Objective: turn findings into usable reports.

Deliverables:

- CLI command
- Markdown output
- HTML output
- summary scorecard

### Phase 4: Packaging and Release

Objective: make installation and local usage easy.

Deliverables:

- plugin install docs
- CLI package scripts
- sample config
- release checklist

---

## 9. Detailed Task Plan

### Task 1: Initialize workspace and package layout

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `packages/core/package.json`
- Create: `packages/cli/package.json`
- Create: `packages/openclaw-plugin/package.json`
- Create: `packages/report-renderer/package.json`

**Step 1: Write the failing workspace smoke test**

Create a smoke test that imports one symbol from each package.

**Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL because packages and exports do not exist yet.

**Step 3: Add minimal package scaffolding**

Create package manifests and placeholder `src/index.ts` exports.

**Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS for smoke import test.

**Step 5: Commit**

```bash
git add .
git commit -m "chore: bootstrap lydia audit workspace"
```

### Task 2: Define audit schema and shared types

**Files:**
- Create: `packages/core/src/schema/audit-event.ts`
- Create: `packages/core/src/schema/tool-audit-record.ts`
- Create: `packages/core/src/schema/finding.ts`
- Create: `packages/core/src/index.ts`
- Test: `packages/core/tests/schema.test.ts`

**Step 1: Write the failing schema tests**

Test that parsed sample events satisfy the expected shape and version fields.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @lydia/core test`
Expected: FAIL because schema module is missing.

**Step 3: Implement minimal schema exports**

Add TypeScript types and small helper guards for validation.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @lydia/core test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core
git commit -m "feat: add shared audit schema"
```

### Task 3: Implement local JSONL writer

**Files:**
- Create: `packages/openclaw-plugin/src/writers/jsonl-writer.ts`
- Create: `packages/openclaw-plugin/src/writers/path-resolver.ts`
- Test: `packages/openclaw-plugin/tests/jsonl-writer.test.ts`

**Step 1: Write failing tests for append-only event writes**

Cover:

- creates parent directory
- appends one event per line
- preserves prior events

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @lydia/openclaw-plugin test`
Expected: FAIL

**Step 3: Implement minimal writer**

Use append-only file writes and deterministic path generation.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @lydia/openclaw-plugin test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/openclaw-plugin
git commit -m "feat: add audit event jsonl writer"
```

### Task 4: Implement redaction helpers

**Files:**
- Create: `packages/openclaw-plugin/src/redact/redact-value.ts`
- Create: `packages/openclaw-plugin/src/redact/summarize-args.ts`
- Test: `packages/openclaw-plugin/tests/redaction.test.ts`

**Step 1: Write failing tests**

Cover:

- truncates large payloads
- masks likely secrets
- preserves safe metadata

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @lydia/openclaw-plugin test`
Expected: FAIL

**Step 3: Implement redaction**

Add conservative heuristics and preview summaries.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @lydia/openclaw-plugin test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/openclaw-plugin
git commit -m "feat: add audit payload redaction"
```

### Task 5: Implement `before_tool_call` hook capture

**Files:**
- Create: `packages/openclaw-plugin/src/hooks/before-tool-call.ts`
- Modify: `packages/openclaw-plugin/src/index.ts`
- Test: `packages/openclaw-plugin/tests/before-tool-call.test.ts`

**Step 1: Write failing hook test**

Assert the hook transforms input into a `tool_call.started` event with a stable `traceId`.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @lydia/openclaw-plugin test`
Expected: FAIL

**Step 3: Implement minimal hook**

Extract session metadata, summarize arguments, derive risk tags, write event.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @lydia/openclaw-plugin test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/openclaw-plugin
git commit -m "feat: capture before tool call audit events"
```

### Task 6: Implement `after_tool_call` hook capture

**Files:**
- Create: `packages/openclaw-plugin/src/hooks/after-tool-call.ts`
- Modify: `packages/openclaw-plugin/src/index.ts`
- Test: `packages/openclaw-plugin/tests/after-tool-call.test.ts`

**Step 1: Write failing hook test**

Assert the hook emits a correlated `tool_call.completed` event with duration and outcome.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @lydia/openclaw-plugin test`
Expected: FAIL

**Step 3: Implement minimal hook**

Correlate using `traceId`, summarize results, classify outcome.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @lydia/openclaw-plugin test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/openclaw-plugin
git commit -m "feat: capture after tool call audit events"
```

### Task 7: Implement event loader and correlator

**Files:**
- Create: `packages/core/src/normalize/load-events.ts`
- Create: `packages/core/src/normalize/correlate-tool-calls.ts`
- Test: `packages/core/tests/correlate-tool-calls.test.ts`

**Step 1: Write failing normalization tests**

Cover:

- started/completed pair becomes one record
- missing completed event produces `unknown`
- out-of-order input still correlates

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @lydia/core test`
Expected: FAIL

**Step 3: Implement loader and correlator**

Read JSONL, parse envelopes, correlate by `traceId`.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @lydia/core test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core
git commit -m "feat: correlate audit events into tool records"
```

### Task 8: Implement initial risk tagging and rules

**Files:**
- Create: `packages/core/src/rules/rule-types.ts`
- Create: `packages/core/src/rules/index.ts`
- Create: `packages/core/src/rules/exec-001.ts`
- Create: `packages/core/src/rules/apr-001.ts`
- Create: `packages/core/src/rules/anom-001.ts`
- Test: `packages/core/tests/rules.test.ts`

**Step 1: Write failing rules tests**

Use fixtures for risky execution, missing approval metadata, repeated bursts.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @lydia/core test`
Expected: FAIL

**Step 3: Implement minimal rule engine**

Return deterministic findings ordered by severity and timestamp.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @lydia/core test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core
git commit -m "feat: add initial audit rules"
```

### Task 9: Implement scoring and summaries

**Files:**
- Create: `packages/core/src/scoring/score-findings.ts`
- Create: `packages/core/src/scoring/summary.ts`
- Test: `packages/core/tests/scoring.test.ts`

**Step 1: Write failing tests**

Assert multiple findings produce stable category scores and a top-level rating.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @lydia/core test`
Expected: FAIL

**Step 3: Implement scoring**

Map findings to category and overall rating using simple weighted severity.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @lydia/core test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core
git commit -m "feat: add audit scoring"
```

### Task 10: Implement Markdown and HTML renderers

**Files:**
- Create: `packages/report-renderer/src/render-markdown.ts`
- Create: `packages/report-renderer/src/render-html.ts`
- Test: `packages/report-renderer/tests/renderers.test.ts`

**Step 1: Write failing renderer tests**

Assert findings and summary appear in both output formats.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @lydia/report-renderer test`
Expected: FAIL

**Step 3: Implement renderers**

Create a readable report template with summary, findings, evidence, and recommendations.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @lydia/report-renderer test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/report-renderer
git commit -m "feat: add audit report renderers"
```

### Task 11: Implement CLI command

**Files:**
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/audit-openclaw.ts`
- Create: `packages/cli/src/config/load-config.ts`
- Test: `packages/cli/tests/audit-openclaw.test.ts`

**Step 1: Write failing CLI tests**

Cover:

- loads events from input path
- prints summary
- writes selected format

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @lydia/cli test`
Expected: FAIL

**Step 3: Implement minimal CLI**

Wire core loader, rules, scoring, and renderer.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @lydia/cli test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/cli
git commit -m "feat: add audit cli command"
```

### Task 12: Build fixture-driven end-to-end test

**Files:**
- Create: `tests/fixtures/openclaw-audit/*.jsonl`
- Create: `tests/e2e/audit-report.e2e.test.ts`

**Step 1: Write failing end-to-end test**

Use realistic started/completed event fixture input and assert final report contains expected findings.

**Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL

**Step 3: Implement any missing glue**

Fix path handling, config loading, and report wiring.

**Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS

**Step 5: Commit**

```bash
git add tests packages
git commit -m "test: add end-to-end audit reporting coverage"
```

### Task 13: Write installation and usage docs

**Files:**
- Create: `README.md`
- Create: `docs/openclaw-plugin-install.md`
- Create: `docs/report-examples.md`

**Step 1: Write failing doc review checklist**

Checklist should confirm docs cover install, config, run, report interpretation, and privacy notes.

**Step 2: Perform doc gap review**

Expected: gaps found before writing docs.

**Step 3: Write docs**

Add:

- what Lydia is
- how to install plugin
- how to run CLI
- what each finding means
- known limitations

**Step 4: Review docs against checklist**

Expected: checklist passes.

**Step 5: Commit**

```bash
git add README.md docs
git commit -m "docs: add lydia tool audit usage guide"
```

### Task 14: Package and release prep

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Create: `.npmrc` if needed
- Create: `CHANGELOG.md`

**Step 1: Write failing CI expectations**

Define required jobs:

- install
- build
- unit tests
- e2e tests

**Step 2: Implement CI workflow**

Expected: workflow validates all packages on push and PR.

**Step 3: Implement release workflow**

Expected: tagged releases build artifacts and publish packages when configured.

**Step 4: Dry-run locally**

Run: `pnpm test`
Run: `pnpm build`
Expected: PASS

**Step 5: Commit**

```bash
git add .github CHANGELOG.md
git commit -m "build: add ci and release workflows"
```

---

## 10. Testing Strategy

### Unit Tests

- schema guards
- redaction helpers
- risk tagging
- each initial audit rule
- scoring
- renderers

### Integration Tests

- plugin hook handler writes correct events
- correlator merges started/completed records
- CLI generates expected outputs from fixture logs

### End-to-End Tests

- sample OpenClaw event stream to final report
- strict mode returns non-zero exit code when high severity findings exist

### Manual Verification

1. Install plugin into a local OpenClaw environment
2. Run a simple safe workflow
3. Run a risky workflow using an execution-capable tool
4. Generate report
5. Confirm findings, evidence, and report readability

---

## 11. Deployment and Release Plan

### Packaging Strategy

Release two installable artifacts:

1. `@lydia/openclaw-plugin`
2. `@lydia/cli`

### Install Flow

1. User installs plugin into OpenClaw plugin setup
2. User installs or runs Lydia CLI
3. Plugin starts writing local audit logs
4. User runs `lydia audit openclaw`
5. User reviews report locally

### Release Environments

1. `dev`
Local test environment with fixture logs and a manual OpenClaw install

2. `beta`
Small group of trusted OpenClaw users

3. `general availability`
Public GitHub release and package publish

### Rollout Stages

1. Internal alpha
Goal: verify hook payload assumptions and file layout

2. Private beta
Goal: validate usefulness of findings and report clarity

3. Public beta
Goal: validate install flow, docs, and rule quality with broader users

4. v1 launch
Goal: stable plugin + CLI + top 10 rules

### Release Checklist

1. CI green on all packages
2. manual install verified on supported OpenClaw version
3. sample report reviewed
4. docs updated
5. changelog updated
6. version tagged
7. release notes published

---

## 12. Risks and Mitigations

### Risk 1: Hook payloads are less rich than expected

Mitigation:

- design schema with optional fields
- log raw shape in dev mode for inspection
- keep correlation logic tolerant

### Risk 2: Event logs contain secrets or sensitive data

Mitigation:

- redact aggressively by default
- allow explicit opt-in for verbose capture
- document privacy model clearly

### Risk 3: Findings feel noisy or obvious

Mitigation:

- start with a small, high-signal rule set
- rank findings by severity and confidence
- test reports against real workflows before launch

### Risk 4: Plugin install friction reduces adoption

Mitigation:

- keep install steps short
- ship a copy-paste quickstart
- provide one-command sample report generation

### Risk 5: Lydia feels redundant with OpenClaw logs

Mitigation:

- emphasize interpreted findings, not raw logs
- show remediation guidance
- highlight cross-session summary and risk scoring

---

## 13. Metrics

### Product Metrics

- time from install to first report
- reports generated per active user
- percentage of reports with at least one actionable finding
- percentage of beta users who rerun Lydia after changing tools or policies

### Quality Metrics

- event correlation success rate
- false positive rate from beta feedback
- crash-free report generation rate
- average report generation time

---

## 14. Launch Narrative

### Positioning

`OpenClaw gives your agent tools. Lydia shows you how those tools are actually being used.`

### v1 Story

The first release focuses on the narrowest useful wedge:

- capture real tool behavior
- classify obvious risk
- generate local, readable reports

This gives Lydia a clear place in the ecosystem without competing with OpenClaw's runtime.

### What Comes Next

After stable adoption of tool-call auditing:

1. session-level anomaly analysis
2. richer approval-chain analysis
3. policy-aware auditing
4. replay and gate features using the same audit stream

---

## 15. Suggested Execution Order

If we execute this plan, the recommended order is:

1. Task 1 through Task 3
2. Task 4 through Task 6
3. Task 7 through Task 9
4. Task 10 through Task 12
5. Task 13 through Task 14

This keeps the team moving from capture, to analysis, to reporting, to release.

---

## 16. Immediate Next Action

Start with the monorepo bootstrap and shared audit schema. Do not begin with fancy rules or HTML polish. The first milestone is simply this:

`Can Lydia capture one OpenClaw tool call into a redacted, correlated JSONL audit record?`

If that works, the rest of the plan becomes straightforward.
