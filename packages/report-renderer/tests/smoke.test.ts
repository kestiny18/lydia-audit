import { describe, expect, it } from "vitest";

import { reportRendererPackage } from "../src/index.js";

describe("report renderer package", () => {
  it("exports a smoke symbol", () => {
    expect(reportRendererPackage).toBe("@lydia/report-renderer");
  });
});
