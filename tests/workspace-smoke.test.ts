import { describe, expect, it } from "vitest";

import { cliPackage } from "../packages/cli/src/index.js";
import { corePackage } from "../packages/core/src/index.js";
import { openclawPluginPackage } from "../packages/openclaw-plugin/src/index.js";
import { reportRendererPackage } from "../packages/report-renderer/src/index.js";

describe("workspace packages", () => {
  it("exposes a smoke export from each package", () => {
    expect(cliPackage).toBe("@lydia/cli");
    expect(corePackage).toBe("@lydia/core");
    expect(openclawPluginPackage).toBe("@lydia/openclaw-plugin");
    expect(reportRendererPackage).toBe("@lydia/report-renderer");
  });
});
