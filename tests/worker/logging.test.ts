import { describe, expect, it } from "vitest";
import rawLogging from "../../src/content/logging.json";
import { LogLevel } from "../../src/enums/LogLevel";
import { loggingSchema } from "../../src/schemas/loggingSchema";
import { ConsoleChannel, type ConsoleSink } from "../../src/worker/logging/channels/ConsoleChannel";
import { KvChannel, type KvStore } from "../../src/worker/logging/channels/KvChannel";
import { StackChannel } from "../../src/worker/logging/channels/StackChannel";
import { createLogger } from "../../src/worker/logging/createLogger";
import { describeError } from "../../src/worker/logging/describeError";
import { Logger } from "../../src/worker/logging/Logger";
import { sanitizeContext } from "../../src/worker/logging/sanitizeContext";
import type { LogRecord } from "../../src/types/LogRecord";

const loggingConfig = loggingSchema.parse(rawLogging);
const fixedClock = () => new Date("2026-11-24T10:00:00.000Z");
const loggerOptions = {
  actor: "TestActor",
  requestId: "req-1",
  includeStackTrace: true,
  redactedKeys: ["token"],
  maxStringLength: 40,
  clock: fixedClock,
};

function recordingSink(): ConsoleSink & { stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return { stdout, stderr, log: (line) => stdout.push(line), error: (line) => stderr.push(line) };
}

describe("logging config", () => {
  it("accepts the shipped logging.json", () => {
    expect(loggingSchema.safeParse(rawLogging).success).toBe(true);
  });

  it("rejects a default channel that does not exist", () => {
    expect(loggingSchema.safeParse({ ...rawLogging, default: "missing" }).success).toBe(false);
  });

  it("rejects unknown keys on the database channel (no table name from config any more)", () => {
    const broken = {
      ...structuredClone(rawLogging),
      channels: { database: { driver: "database", level: "error", table: "x" } },
    };
    expect(loggingSchema.safeParse({ ...broken, default: "database" }).success).toBe(false);
  });
});

describe("Logger + channels", () => {
  it("writes 5W JSON lines, info to stdout and errors to stderr", async () => {
    const sink = recordingSink();
    const stack = new StackChannel("test", [
      new ConsoleChannel("out", "stdout", LogLevel.Debug, LogLevel.Info, sink),
      new ConsoleChannel("err", "stderr", LogLevel.Warn, undefined, sink),
    ]);
    const logger = new Logger(stack, loggerOptions);
    logger.info({ event: "contact_received", location: "POST /api/contact", reason: "valid" });
    logger.error({ event: "contact_failed", reason: "kv unavailable" });
    await logger.drain();

    expect(sink.stdout).toHaveLength(1);
    expect(sink.stderr).toHaveLength(1);
    const parsed = JSON.parse(sink.stderr[0] ?? "{}") as LogRecord & { channel: string };
    expect(parsed).toMatchObject({
      timestamp: "2026-11-24T10:00:00.000Z",
      level: "error",
      actor: "TestActor",
      event: "contact_failed",
      reason: "kv unavailable",
      requestId: "req-1",
      channel: "err",
    });
  });

  it("redacts configured keys and truncates long strings", () => {
    const sanitized = sanitizeContext(
      { token: "abc", note: "x".repeat(100), nested: { Token: "def", fine: 1 } },
      { redactedKeys: ["token"], maxStringLength: 40 },
    );
    expect(sanitized["token"]).toBe("[redacted]");
    expect(String(sanitized["note"]).length).toBeLessThan(60);
    expect(sanitized["nested"]).toEqual({ Token: "[redacted]", fine: 1 });
  });

  it("keeps exception details in the log, stack only when enabled", () => {
    const withStack = describeError(new Error("boom"), true);
    const withoutStack = describeError(new Error("boom"), false);
    expect(withStack.stack).toContain("boom");
    expect(withoutStack).toEqual({ name: "Error", message: "boom" });
    expect(describeError("plain", false)).toEqual({ name: "NonErrorThrown", message: "plain" });
  });

  it("never throws when a channel fails, and other stack members still receive the record", async () => {
    const sink = recordingSink();
    const failingStore: KvStore = { put: () => Promise.reject(new Error("kv down")) };
    const stack = new StackChannel("test", [
      new KvChannel("kv", failingStore, LogLevel.Error, { keyPrefix: "log:", ttlSeconds: 60 }),
      new ConsoleChannel("err", "stderr", LogLevel.Warn, undefined, sink),
    ]);
    const logger = new Logger(stack, loggerOptions);
    logger.exception({ event: "unhandled_exception" }, new Error("handler broke"));
    await expect(logger.drain()).resolves.toBeUndefined();
    expect(sink.stderr).toHaveLength(1);
  });

  it("stores to KV with a prefixed key and TTL, and is inert without a binding", async () => {
    const writes: { key: string; ttl: number | undefined }[] = [];
    const store: KvStore = {
      put: (key, _value, options) => {
        writes.push({ key, ttl: options?.expirationTtl });
        return Promise.resolve();
      },
    };
    const bound = new KvChannel("kv", store, LogLevel.Error, { keyPrefix: "log:", ttlSeconds: 600 });
    const unbound = new KvChannel("kv", undefined, LogLevel.Error, { keyPrefix: "log:", ttlSeconds: 600 });
    expect(unbound.accepts(LogLevel.Error)).toBe(false);
    expect(bound.accepts(LogLevel.Warn)).toBe(false);
    const logger = new Logger(bound, loggerOptions);
    logger.error({ event: "kv_event" });
    await logger.drain();
    expect(writes[0]?.key.startsWith("log:2026-11-24T10:00:00.000Z:req-1")).toBe(true);
    expect(writes[0]?.ttl).toBe(600);
  });

  it("LOG_CHANNEL and LOG_LEVEL override the configured default", async () => {
    const silent = createLogger({
      config: loggingConfig,
      environment: { LOG_CHANNEL: "silent" },
      actor: "Worker",
      requestId: "r",
    });
    silent.error({ event: "nothing_happens" });
    await expect(silent.drain()).resolves.toBeUndefined();

    const ignoredUnknown = createLogger({
      config: loggingConfig,
      environment: { LOG_CHANNEL: "does-not-exist" },
      actor: "Worker",
      requestId: "r",
    });
    expect(ignoredUnknown.requestId).toBe("r");
  });
});
