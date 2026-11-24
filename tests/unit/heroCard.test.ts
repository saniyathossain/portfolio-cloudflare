import { describe, expect, it } from "vitest";
import { stepIndex, swapDirectionOf, tintCustomProperties } from "../../src/lib/heroCard";

const tints = {
  accent: { tint: "var(--accent)", ink: "var(--accent-bright)" },
  blue: { tint: "var(--c-blue)", ink: "var(--c-blue)" },
};

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

describe("tintCustomProperties", () => {
  it("resolves a known tint", () => {
    expect(tintCustomProperties("blue", tints, "accent")).toEqual({ "--tint": "var(--c-blue)", "--tint-ink": "var(--c-blue)" });
  });
  it("falls back for unknown tints", () => {
    expect(tintCustomProperties("nope", tints, "accent")["--tint"]).toBe("var(--accent)");
  });
  it("throws when the fallback is missing too", () => {
    expect(() => tintCustomProperties("nope", {}, "accent")).toThrow();
  });
});
