import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { Database } from "../../src/worker/database/types";

/** `node:sqlite` is looked up at runtime: the bundler used by vitest does not recognise this newer built-in. */
const { DatabaseSync } = process.getBuiltinModule("node:sqlite");

const MIGRATIONS = join(import.meta.dirname, "..", "..", "migrations");

/**
 * A real in-memory SQLite with every file in `migrations/` applied, behind the same ORM type the Worker uses. Tests that
 * run repositories against it prove the schema in `src/worker/database/schema.ts` still matches the shipped migrations.
 */
export function createSqliteTestDatabase(): {
  readonly database: Database;
  readonly raw: InstanceType<typeof DatabaseSync>;
} {
  const raw = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    raw.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
  const database = drizzle((sql, params, method) => {
    const statement = raw.prepare(sql);
    if (method === "run") {
      statement.run(...(params as never[]));
      return Promise.resolve({ rows: [] });
    }
    statement.setReturnArrays(true);
    const rows = statement.all(...(params as never[])) as unknown as unknown[][];
    return Promise.resolve({ rows: method === "get" ? (rows[0] ?? []) : rows });
  });
  return { database: database, raw };
}
