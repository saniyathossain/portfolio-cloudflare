import { describe, expect, it } from "vitest";
import rawVitals from "../../src/content/vitals.json";
import { percentile, rateVital, summarizeVitals } from "../../src/lib/webVitals";
import { BUILD_ENV, readSampleRate } from "../../src/lib/buildSettings";
import { vitalsSchema } from "../../src/schemas/vitalsSchema";
import type { StoredVitals } from "../../src/types/WebVitals";

const config = vitalsSchema.parse(rawVitals);

function row(overrides: Partial<StoredVitals> = {}): StoredVitals {
  return {
    timestamp: "2026-11-25T00:00:00.000Z",
    page: "/",
    navigationType: "navigate",
    country: "BD",
    deviceType: "mobile",
    deviceVendor: "Google",
    deviceModel: "Pixel 8",
    browser: "Chrome",
    browserVersion: "157.0.0",
    os: "Android",
    osVersion: "15.0.0",
    effectiveConnection: "4g",
    saveData: false,
    viewportWidth: 412,
    viewportHeight: 823,
    devicePixelRatio: 2.6,
    memoryGb: 8,
    cores: 8,
    metrics: { lcp: 1200, cls: 0.02, inp: 90, fcp: 900, ttfb: 200, tbt: 80 },
    attribution: { lcp: { section: "home", element: "img#heroBaseImg" } },
    sections: { home: { visibleMs: 4000, cls: 0.02 }, experience: { visibleMs: 1500, cls: 0 } },
    ...overrides,
  };
}

describe("vitals.json", () => {
  it("passes its schema", () => {
    expect(config.percentile).toBe(75);
    expect(config.sections).toContain("home");
  });
});

describe("rateVital", () => {
  it("uses Google's good / poor boundaries", () => {
    expect(rateVital("lcp", 2500, config.thresholds)).toBe("good");
    expect(rateVital("lcp", 3000, config.thresholds)).toBe("needs-improvement");
    expect(rateVital("lcp", 4001, config.thresholds)).toBe("poor");
    expect(rateVital("cls", 0.1, config.thresholds)).toBe("good");
    expect(rateVital("cls", 0.3, config.thresholds)).toBe("poor");
  });
});

describe("percentile", () => {
  it("is the nearest-rank percentile and 0 for no data", () => {
    expect(percentile([], 75)).toBe(0);
    expect(percentile([10, 20, 30, 40], 75)).toBe(30);
    expect(percentile([5], 75)).toBe(5);
  });
});

describe("summarizeVitals", () => {
  it("reports percentile and good / needs-improvement / poor shares, overall and per facet", () => {
    const rows = [
      row(),
      row({ metrics: { lcp: 3000 } }),
      row({
        deviceType: "desktop",
        deviceModel: "",
        deviceVendor: "",
        metrics: { lcp: 5000 },
        attribution: { lcp: { section: "experience", element: "h2" } },
      }),
    ];
    const summary = summarizeVitals(rows, config);
    expect(summary.samples).toBe(3);
    expect(summary.overall.lcp).toMatchObject({
      samples: 3,
      percentile: 5000,
      good: 0.333,
      needsImprovement: 0.333,
      poor: 0.333,
    });
    expect(Object.keys(summary.byDeviceType).sort()).toEqual(["desktop", "mobile"]);
    expect(summary.byDeviceModel["Google Pixel 8"]?.lcp?.samples).toBe(2);
    expect(summary.byDeviceModel["unknown"]).toBeDefined();
    expect(summary.byBrowser["Chrome 157"]).toBeDefined();
    expect(summary.bySection["home"]).toMatchObject({ samples: 3, lcpShare: 0.667 });
    expect(summary.bySection["experience"]?.lcpShare).toBe(0.333);
  });

  it("is empty-safe", () => {
    const summary = summarizeVitals([], config);
    expect(summary.samples).toBe(0);
    expect(summary.overall).toEqual({});
  });
});

describe("readSampleRate", () => {
  it("clamps to 0..1 and treats junk as off", () => {
    expect(readSampleRate({})).toBe(0);
    expect(readSampleRate({ [BUILD_ENV.rumSampleRate]: "abc" })).toBe(0);
    expect(readSampleRate({ [BUILD_ENV.rumSampleRate]: "-1" })).toBe(0);
    expect(readSampleRate({ [BUILD_ENV.rumSampleRate]: "0.25" })).toBe(0.25);
    expect(readSampleRate({ [BUILD_ENV.rumSampleRate]: "5" })).toBe(1);
  });
});
