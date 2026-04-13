import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { lydiaOpenClawPluginConfigSchema, resolveLydiaOpenClawPluginConfig } from "../src/index.js";

describe("openclaw plugin config", () => {
  it("resolves sensible defaults", () => {
    expect(resolveLydiaOpenClawPluginConfig()).toEqual({
      baseDir: path.join(os.homedir(), ".lydia-audit", "openclaw"),
      workspaceId: undefined,
      enforceApprovals: false
    });
  });

  it("validates plugin config types", () => {
    expect(lydiaOpenClawPluginConfigSchema.validate?.({ enforceApprovals: true })).toEqual({
      ok: true,
      value: { enforceApprovals: true }
    });
    expect(lydiaOpenClawPluginConfigSchema.validate?.({ enforceApprovals: "yes" })).toEqual({
      ok: false,
      errors: ["enforceApprovals must be a boolean"]
    });
  });
});
