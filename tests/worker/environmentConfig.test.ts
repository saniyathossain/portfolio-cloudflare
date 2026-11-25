import { describe, expect, it } from "vitest";
import rawSecurity from "../../src/content/security.json";
import { EnvVar } from "../../src/enums/EnvVar";
import { EnvironmentConfigResolver } from "../../src/worker/config/EnvironmentConfigResolver";
import { KvContactSubmissionRepository } from "../../src/worker/repositories/ContactSubmissionRepository";
import type { KvNamespace, WorkerEnvironment } from "../../src/worker/types/WorkerEnvironment";
import type { SecurityConfig } from "../../src/types/SecurityConfig";
import { Logger } from "../../src/worker/logging/Logger";
import { NullChannel } from "../../src/worker/logging/channels/NullChannel";

const base = rawSecurity as unknown as SecurityConfig;
const noAssets = { fetch: () => Promise.reject(new Error("not used")) };
const environment = (values: Record<string, string>): WorkerEnvironment => ({ ASSETS: noAssets, ...values });

describe("EnvironmentConfigResolver", () => {
  it("keeps the JSON policy when no variable is set", () => {
    const { config, issues } = new EnvironmentConfigResolver(base).resolve(environment({}));
    expect(config).toEqual(base);
    expect(issues).toEqual([]);
  });

  it("lets valid variables override limits and rate rules without touching the base config", () => {
    const resolver = new EnvironmentConfigResolver(base);
    const { config, issues } = resolver.resolve(
      environment({
        [EnvVar.RateLimitContactLimit]: "7",
        [EnvVar.RateLimitContactWindowSeconds]: "120",
        [EnvVar.MaxContactBodyBytes]: "4096",
        [EnvVar.AdminListMaxLimit]: "25",
      }),
    );
    expect(issues).toEqual([]);
    expect(config.rateLimits.contact).toEqual({ limit: 7, windowSeconds: 120 });
    expect(config.limits.maxContactBodyBytes).toBe(4096);
    expect(config.adminList.maxLimit).toBe(25);
    expect(base.rateLimits.contact.limit).not.toBe(7);
  });

  it("ignores non-numeric and out-of-range values and reports them", () => {
    const { config, issues } = new EnvironmentConfigResolver(base).resolve(
      environment({ [EnvVar.RateLimitContactLimit]: "lots", [EnvVar.MaxUrlLength]: "5", [EnvVar.MaxNameLength]: "-3" }),
    );
    expect(config.rateLimits.contact.limit).toBe(base.rateLimits.contact.limit);
    expect(config.limits.maxUrlLength).toBe(base.limits.maxUrlLength);
    expect(issues).toHaveLength(3);
    expect(issues[0]).toContain(EnvVar.MaxUrlLength);
  });

  it("memoises per environment object", () => {
    const resolver = new EnvironmentConfigResolver(base);
    const env = environment({ [EnvVar.MaxEmailLength]: "100" });
    expect(resolver.resolve(env)).toBe(resolver.resolve(env));
  });
});

describe("KvContactSubmissionRepository", () => {
  const logger = new Logger(new NullChannel("null"), {
    actor: "test",
    requestId: "r1",
    includeStackTrace: false,
    redactedKeys: [],
    maxStringLength: 100,
  });

  function fakeKv(): KvNamespace & { data: Map<string, string> } {
    const data = new Map<string, string>();
    return {
      data,
      get: (key) => Promise.resolve(data.get(key) ?? null),
      put: (key, value) => {
        data.set(key, value);
        return Promise.resolve();
      },
      list: ({ prefix, limit }) =>
        Promise.resolve({
          keys: [...data.keys()]
            .filter((key) => key.startsWith(prefix))
            .slice(0, limit)
            .map((name) => ({ name })),
        }),
    };
  }
  const submission = (ts: string) => ({
    name: "A",
    email: "a@b.co",
    project: "p",
    ts,
    ip: "1.1.1.1",
    country: "BD",
    asn: undefined,
    ua: "ua",
    ray: "ray",
  });

  it("is a no-op without a binding", async () => {
    const repository = new KvContactSubmissionRepository(undefined, 60, logger);
    expect(repository.isConfigured).toBe(false);
    expect(await repository.save(submission("2026-01-01T00:00:00.000Z"))).toBe(false);
    expect(await repository.recent(10)).toEqual([]);
  });

  it("stores and returns newest first, skipping corrupt entries", async () => {
    const kv = fakeKv();
    const repository = new KvContactSubmissionRepository(kv, 60, logger);
    await repository.save(submission("2026-01-01T00:00:00.000Z"));
    await repository.save(submission("2026-02-01T00:00:00.000Z"));
    kv.data.set("contact:broken", "{not json");
    const recent = await repository.recent(10);
    expect(recent.map((item) => item.ts)).toEqual(["2026-02-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"]);
  });
});
