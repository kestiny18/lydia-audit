import { describe, expect, it } from "vitest";

import { corePackage } from "../src/index.js";

describe("core package", () => {
  it("exports a smoke symbol", () => {
    expect(corePackage).toBe("@lydia/core");
  });
});
