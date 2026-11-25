import { describe, expect, it } from "vitest";
import { stepIndex, swapDirectionOf, resolveTintName } from "../../src/lib/heroCard";

const tintNames = ["accent", "primary", "blue"];

describe("stepIndex", () => {
  it("wraps forwards and backwards", () => {
    expect(stepIndex(0, 1, 3)).toBe(1);
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(0, -1, 3)).toBe(2);
  });
  it("is 0 for an empty list", () => {
    expect(stepIndex(0, 1, 0)).toBe(0);
  });
});

describe("swapDirectionOf", () => {
  it("maps sign to direction", () => {
    expect(swapDirectionOf(1)).toBe("next");
    expect(swapDirectionOf(-1)).toBe("prev");
  });
});

describe("resolveTintName", () => {
  it("keeps a known tint", () => {
    expect(resolveTintName("blue", tintNames, "accent")).toBe("blue");
  });
  it("falls back for unknown tints", () => {
    expect(resolveTintName("nope", tintNames, "accent")).toBe("accent");
  });
  it("throws when the fallback is missing too", () => {
    expect(() => resolveTintName("nope", [], "accent")).toThrow();
  });
});
