import { describe, expect, it } from "vitest";
import { applyBuildEnvironment, BUILD_ENV, pickSetting } from "../../src/lib/buildSettings";

const site = { turnstileSiteKey: "", analytics: { googleId: "G-FROMJSON", cloudflareToken: "" } };

describe("pickSetting", () => {
  it("prefers a non-blank environment value", () => {
    expect(pickSetting(" G-ABC ", "G-JSON")).toBe("G-ABC");
  });
  it("falls back to the JSON value when the variable is unset or blank", () => {
    expect(pickSetting(undefined, "G-JSON")).toBe("G-JSON");
    expect(pickSetting("   ", "G-JSON")).toBe("G-JSON");
  });
});

describe("applyBuildEnvironment", () => {
  it("overrides only the variables that are set", () => {
    const result = applyBuildEnvironment(site, { [BUILD_ENV.turnstileSiteKey]: "0xKEY", [BUILD_ENV.cloudflareAnalyticsToken]: "tok123" });
    expect(result).toEqual({ turnstileSiteKey: "0xKEY", analytics: { googleId: "G-FROMJSON", cloudflareToken: "tok123" } });
  });
  it("returns the JSON values when nothing is set and does not mutate the input", () => {
    expect(applyBuildEnvironment(site, {})).toEqual(site);
    expect(site.analytics.googleId).toBe("G-FROMJSON");
  });
});
