import { describe, expect, it } from "vitest";

import { cliPackage } from "../src/index.js";

describe("cli package", () => {
  it("exports a smoke symbol", () => {
    expect(cliPackage).toBe("@lydia/cli");
  });
});
