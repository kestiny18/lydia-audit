import { describe, expect, it } from "vitest";

import { openclawPluginPackage } from "../src/index.js";

describe("openclaw plugin package", () => {
  it("exports a smoke symbol", () => {
    expect(openclawPluginPackage).toBe("@lydia/openclaw-plugin");
  });
});
