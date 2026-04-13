# OpenClaw Local Demo

## Goal

Run Lydia Tool Audit as a real local OpenClaw plugin and verify that tool-call audit logs are generated.

## What this demo covers

1. Build the Lydia plugin package
2. Install it into a local OpenClaw environment
3. Add minimal plugin config
4. Trigger a tool call
5. Verify JSONL audit output

## Prerequisites

- Node.js 24+
- pnpm 10+
- a working local OpenClaw installation

## Step 1: Build Lydia

From this repository root:

```bash
pnpm install
pnpm build
```

## Step 2: Pack the plugin

Create a tarball that can be installed into your OpenClaw environment:

```bash
pnpm --filter @lydia/openclaw-plugin pack --out ../../artifacts/lydia-openclaw-plugin.tgz
```

This produces:

`artifacts/lydia-openclaw-plugin.tgz`

## Step 3: Install into your OpenClaw environment

In the directory where your OpenClaw runtime dependencies are managed:

```bash
pnpm add <absolute-path-to-lydia-audit>\artifacts\lydia-openclaw-plugin.tgz
```

Example:

```bash
pnpm add E:\WorkSpace\production\lydia-audit\artifacts\lydia-openclaw-plugin.tgz
```

## Step 4: Add minimal plugin config

Merge this snippet into your OpenClaw config:

```json
{
  "plugins": {
    "@lydia/openclaw-plugin": {
      "baseDir": "~/.lydia-audit/openclaw",
      "workspaceId": "demo-workspace",
      "enforceApprovals": false
    }
  }
}
```

You can also start from:

`docs/examples/openclaw-plugin-config.example.json`

### Config meanings

- `baseDir`: where Lydia writes JSONL audit logs
- `workspaceId`: logical partition name for this OpenClaw environment
- `enforceApprovals`: if `true`, Lydia asks for approval before high-risk execution and supply-chain style tool calls

## Step 5: Restart OpenClaw

Restart your OpenClaw process so it reloads installed extensions and plugin config.

## Step 6: Trigger a simple tool call

Use any prompt that is likely to invoke a tool. Examples:

- ask the agent to read a file
- ask the agent to list directory contents
- ask the agent to run a harmless command

## Step 7: Verify audit output

Expected log path:

```text
~/.lydia-audit/openclaw/demo-workspace/YYYY-MM-DD.jsonl
```

Expected event types:

- `tool_call.started`
- `tool_call.completed`

You should see JSONL lines similar to:

```json
{"eventType":"tool_call.started","traceId":"...","payload":{"toolName":"exec","argumentsSummary":"command=dir","riskTags":["execution"]}}
{"eventType":"tool_call.completed","traceId":"...","payload":{"toolName":"exec","outcome":"success","resultSummary":"..."}}
```

## Step 8: Generate a report from captured logs

Back in the Lydia repository:

```bash
node packages/cli/dist/index.js audit openclaw --input <lydia-log-dir> --format markdown
```

Example:

```bash
node packages/cli/dist/index.js audit openclaw --input C:\Users\yingk\.lydia-audit\openclaw --format markdown
```

## Recommended first demo settings

For the first run, use:

- `enforceApprovals: false`
- a dedicated `workspaceId` like `demo-workspace`
- a harmless tool-invoking task

This keeps the first integration focused on visibility rather than intervention.

## If it does not load

Check:

1. The plugin package was installed into the same environment OpenClaw loads from
2. The built package contains `dist/openclaw-entry.js`
3. The package manifest includes:

```json
{
  "openclaw": {
    "extensions": ["./dist/openclaw-entry.js"]
  }
}
```

4. OpenClaw was restarted after installation
5. The plugin config key matches `@lydia/openclaw-plugin`
