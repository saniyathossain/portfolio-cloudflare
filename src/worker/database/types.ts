import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

/**
 * The ORM handle repositories are written against. It is the SQLite-family base class, so any driver that produces it
 * (D1, libSQL, a test double over node:sqlite) works with the same repositories.
 */
export type Database = BaseSQLiteDatabase<"async", unknown>;

/** Worker bindings and vars are looked up by (config-defined) name, so the environment is a plain record. */
export type DatabaseEnvironment = Readonly<Record<string, unknown>>;
