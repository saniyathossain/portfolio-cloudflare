/** How a database connection is opened. Mirrors Laravel's `DB_CONNECTION` drivers; add one by adding a case + a factory. */
export enum DatabaseDriver {
  /** Cloudflare D1 binding (SQLite). */
  D1 = "d1",
  /** No database: every repository degrades to its harmless no-op. */
  Null = "null",
}
