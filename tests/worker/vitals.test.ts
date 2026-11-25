import { describe, expect, it } from "vitest";
import rawVitals from "../../src/content/vitals.json";
import { vitalsSchema } from "../../src/schemas/vitalsSchema";
import { DrizzleVitalsRepository } from "../../src/worker/repositories/drizzle/DrizzleVitalsRepository";
import { createSqliteTestDatabase } from "../support/sqliteTestDatabase";
import { parseVitalsPayload } from "../../src/worker/security/vitalsPayload";
import { Logger } from "../../src/worker/logging/Logger";
import { NullChannel } from "../../src/worker/logging/channels/NullChannel";
import type { StoredVitals } from "../../src/types/WebVitals";

const config = vitalsSchema.parse(rawVitals);

describe("parseVitalsPayload", () => {
  const valid = {
    page: "/",
    navigationType: "navigate",
    metrics: { lcp: 1234.5678, cls: 0.0421, inp: 120, fcp: 800, ttfb: 90, tbt: 60, evil: 1 },
    attribution: { lcp: { section: "home", element: "img#heroBaseImg" }, cls: { section: "nope", element: "x" } },
    sections: { home: { visibleMs: 5000, cls: 0.01 }, "<script>": { visibleMs: 1, cls: 1 } },
    device: { model: "Pixel 8", platform: "Android", effectiveConnection: "4g", viewportWidth: 412, memoryGb: 8 },
    extra: "ignored",
  };

  it("keeps known metrics and sections, rounds numbers, drops unknown keys and unknown sections", () => {
    const payload = parseVitalsPayload(valid, config);
    expect(payload?.metrics).toEqual({ lcp: 1234.568, cls: 0.042, inp: 120, fcp: 800, ttfb: 90, tbt: 60 });
    expect(payload?.attribution.lcp).toEqual({ section: "home", element: "img#heroBaseImg" });
    expect(payload?.attribution.cls).toBeUndefined();
    expect(Object.keys(payload?.sections ?? {})).toEqual(["home"]);
    expect(payload?.device.model).toBe("Pixel 8");
  });

  it("clamps absurd numbers and strips unsafe characters from text", () => {
    const payload = parseVitalsPayload(
      { metrics: { lcp: 9e12, cls: -5 }, device: { model: "<b>Pix\nel</b>", cores: 99999 }, page: "/x?y=<z>" },
      config,
    );
    expect(payload?.metrics.lcp).toBe(config.ranges.maxTimeMs);
    expect(payload?.metrics.cls).toBe(0);
    expect(payload?.device.model).toBe("bPix el/b");
    expect(payload?.device.cores).toBe(config.ranges.maxCores);
    expect(payload?.page).toBe("/xyz");
  });

  it("returns nothing when there is no usable metric or the body is not an object", () => {
    expect(parseVitalsPayload({ metrics: {} }, config)).toBeUndefined();
    expect(parseVitalsPayload("junk", config)).toBeUndefined();
    expect(parseVitalsPayload(null, config)).toBeUndefined();
  });
});

describe("DrizzleVitalsRepository (real SQLite, shipped migrations)", () => {
  const logger = new Logger(new NullChannel("null"), {
    actor: "test",
    requestId: "r",
    includeStackTrace: false,
    redactedKeys: [],
    maxStringLength: 100,
  });
  const stored: StoredVitals = {
    timestamp: "2026-11-25T01:00:00.000Z",
    page: "/",
    navigationType: "navigate",
    country: "BD",
    deviceType: "mobile",
    deviceVendor: "Google",
    deviceModel: "Pixel 8",
    browser: "Chrome",
    browserVersion: "157",
    os: "Android",
    osVersion: "15",
    effectiveConnection: "4g",
    saveData: true,
    viewportWidth: 412,
    viewportHeight: 823,
    devicePixelRatio: 2.6,
    memoryGb: 8,
    cores: 8,
    metrics: { lcp: 1200, cls: 0.02 },
    attribution: { lcp: { section: "home", element: "img" } },
    sections: { home: { visibleMs: 1000, cls: 0.02 } },
  };

  it("is a no-op without a connection", async () => {
    const repository = new DrizzleVitalsRepository(undefined, 90, logger);
    expect(repository.isConfigured).toBe(false);
    expect(await repository.save(stored)).toBe(false);
    expect(await repository.recent("2026-01-01", 10)).toEqual([]);
  });

  it("round-trips a page view, leaving unmeasured metrics absent", async () => {
    const { database } = createSqliteTestDatabase();
    const repository = new DrizzleVitalsRepository(database, 90, logger, 0);
    expect(await repository.save(stored)).toBe(true);
    expect(await repository.recent("2026-01-01", 5)).toEqual([stored]);
  });

  it("filters by time, orders newest first and honours the limit", async () => {
    const { database } = createSqliteTestDatabase();
    const repository = new DrizzleVitalsRepository(database, 90, logger, 0);
    await repository.save({ ...stored, timestamp: "2026-11-01T00:00:00.000Z" });
    await repository.save({ ...stored, timestamp: "2026-11-20T00:00:00.000Z" });
    await repository.save({ ...stored, timestamp: "2026-11-24T00:00:00.000Z" });
    expect((await repository.recent("2026-11-10", 10)).map((row) => row.timestamp)).toEqual([
      "2026-11-24T00:00:00.000Z",
      "2026-11-20T00:00:00.000Z",
    ]);
    expect(await repository.recent("2026-01-01", 1)).toHaveLength(1);
  });

  it("prunes rows older than the retention window on a save", async () => {
    const { database, raw } = createSqliteTestDatabase();
    const repository = new DrizzleVitalsRepository(database, 90, logger, 1, () => 0);
    await repository.save({ ...stored, timestamp: "2000-01-01T00:00:00.000Z" });
    await repository.save({ ...stored, timestamp: new Date().toISOString() });
    expect(raw.prepare("SELECT COUNT(*) AS total FROM web_vitals").get()).toEqual({ total: 1 });
  });

  it("never throws when the store fails: the beacon is still answered", async () => {
    const { database, raw } = createSqliteTestDatabase();
    raw.exec("DROP TABLE web_vitals");
    expect(await new DrizzleVitalsRepository(database, 90, logger, 0).save(stored)).toBe(false);
  });
});
