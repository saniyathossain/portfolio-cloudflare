/**
 * Table definitions (the ORM's source of truth for column names and types). The hand-written SQL in `migrations/` creates
 * the same tables; tests/worker/database.test.ts applies those migrations to a real SQLite and fails on any drift.
 * Only `sqlite-core` is imported, so the same schema serves every SQLite-family driver (D1 today, libSQL/Turso later).
 */
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { VitalsPayload } from "../../types/WebVitals";

export const webVitals = sqliteTable(
  "web_vitals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    timestamp: text("timestamp").notNull(),
    page: text("page").notNull(),
    navigationType: text("navigation_type").notNull(),
    country: text("country").notNull(),
    deviceType: text("device_type").notNull(),
    deviceVendor: text("device_vendor").notNull(),
    deviceModel: text("device_model").notNull(),
    browser: text("browser").notNull(),
    browserVersion: text("browser_version").notNull(),
    os: text("os").notNull(),
    osVersion: text("os_version").notNull(),
    effectiveConnection: text("effective_connection").notNull(),
    saveData: integer("save_data", { mode: "boolean" }).notNull(),
    viewportWidth: integer("viewport_width").notNull(),
    viewportHeight: integer("viewport_height").notNull(),
    devicePixelRatio: real("device_pixel_ratio").notNull(),
    memoryGb: real("memory_gb").notNull(),
    cores: integer("cores").notNull(),
    lcp: real("lcp"),
    cls: real("cls"),
    inp: real("inp"),
    fcp: real("fcp"),
    ttfb: real("ttfb"),
    tbt: real("tbt"),
    attribution: text("attribution", { mode: "json" }).$type<VitalsPayload["attribution"]>().notNull(),
    sections: text("sections", { mode: "json" }).$type<VitalsPayload["sections"]>().notNull(),
  },
  (table) => [
    index("web_vitals_timestamp_idx").on(table.timestamp),
    index("web_vitals_device_type_idx").on(table.deviceType),
  ],
);

export const logs = sqliteTable(
  "logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    timestamp: text("timestamp").notNull(),
    level: text("level").notNull(),
    actor: text("actor").notNull(),
    event: text("event").notNull(),
    location: text("location").notNull(),
    reason: text("reason").notNull(),
    requestId: text("request_id").notNull(),
    payload: text("payload").notNull(),
  },
  (table) => [index("logs_timestamp_idx").on(table.timestamp), index("logs_request_id_idx").on(table.requestId)],
);
