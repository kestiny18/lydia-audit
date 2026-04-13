# OpenClaw Plugin Install

## Goal

Install Lydia's OpenClaw plugin so tool-call audit events are written locally.

For a copy-paste local installation walkthrough, see:

`docs/openclaw-local-demo.md`

## Native plugin shape

This package now exposes a real OpenClaw native extension entry through its package manifest:

```json
{
  "openclaw": {
    "extensions": ["./dist/openclaw-entry.js"]
  }
}
```

OpenClaw can discover and load that compiled entry directly from the package.

## Plugin behavior

The plugin records:

- `tool_call.started`
- `tool_call.completed`

Each event is written to a local JSONL log under:

`~/.lydia-audit/openclaw/<workspace>/<date>.jsonl`

## Runtime entry

The native entry uses OpenClaw's official plugin SDK:

```ts
import plugin from "@lydia/openclaw-plugin/openclaw-entry";
```

It registers:

- `before_tool_call`
- `after_tool_call`

## Supported plugin config

```json
{
  "plugins": {
    "@lydia/openclaw-plugin": {
      "baseDir": "~/.lydia-audit/openclaw",
      "workspaceId": "my-workspace",
      "enforceApprovals": false
    }
  }
}
```

If `enforceApprovals` is enabled, Lydia will request approval for high-risk execution and supply-chain style tool calls in addition to logging them.

## Privacy notes

- arguments are redacted and truncated by default
- likely secret values are masked
- raw file contents are not stored by default
