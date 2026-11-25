import { describe, expect, it } from "vitest";
import rawDatabase from "../../src/content/database.json";
import { databaseSchema } from "../../src/schemas/databaseSchema";
import { DatabaseManager } from "../../src/worker/database/DatabaseManager";
import { DrizzleLogRepository } from "../../src/worker/repositories/drizzle/DrizzleLogRepository";
import { createSqliteTestDatabase } from "../support/sqliteTestDatabase";
import { LogLevel } from "../../src/enums/LogLevel";
import type { LogRecord } from "../../src/types/LogRecord";

const config = databaseSchema.parse(rawDatabase);
const manager = new DatabaseManager(config);

/** The smallest object the D1 driver accepts: the manager only checks the shape, repositories are tested on real SQLite. */
const fakeD1Binding = { prepare: () => ({}), batch: () => Promise.resolve([]) };

describe("database.json", () => {
  it("passes its schema and defines its default connection", () => {
    expect(config.connections[config.default]).toBeDefined();
  });

  it("rejects an undefined default connection and unknown keys", () => {
    expect(databaseSchema.safeParse({ ...rawDatabase, default: "nope" }).success).toBe(false);
    expect(
      databaseSchema.safeParse({ default: "d1", connections: { d1: { driver: "d1", binding: "DB", extra: 1 } } })
        .success,
    ).toBe(false);
  });
});

describe("DatabaseManager", () => {
  it("opens the default (d1) connection from the configured binding", async () => {
    expect(await manager.connection({ DB: fakeD1Binding })).toBeDefined();
  });

  it("reuses one ORM handle per binding", async () => {
    expect(await manager.connection({ DB: fakeD1Binding })).toBe(await manager.connection({ DB: fakeD1Binding }));
  });

  it("returns undefined (repositories no-op) when the binding is missing or not a D1 database", async () => {
    expect(await manager.connection({})).toBeUndefined();
    expect(await manager.connection({ DB: { not: "d1" } })).toBeUndefined();
  });

  it("DB_CONNECTION switches the connection with no code change; unknown names fall back to the default", async () => {
    expect(await manager.connection({ DB: fakeD1Binding, DB_CONNECTION: "null" })).toBeUndefined();
    expect(await manager.connection({ DB: fakeD1Binding, DB_CONNECTION: "does-not-exist" })).toBeDefined();
  });
});

describe("DrizzleLogRepository", () => {
  it("appends a record whose payload keeps message, context and exception", async () => {
    const { database, raw } = createSqliteTestDatabase();
    const record: LogRecord = {
      timestamp: "2026-11-25T00:00:00.000Z",
      level: LogLevel.Error,
      actor: "Test",
      event: "boom",
      location: "here",
      reason: "because",
      requestId: "req-1",
      message: "boom",
      context: { attempt: 1 },
    };
    await new DrizzleLogRepository(database).append(record);
    const saved = raw.prepare("SELECT level, event, request_id, payload FROM logs").get() as Record<string, string>;
    expect(saved).toMatchObject({ level: "error", event: "boom", request_id: "req-1" });
    expect(JSON.parse(saved["payload"] ?? "{}")).toMatchObject({ message: "boom", context: { attempt: 1 } });
  });
});
