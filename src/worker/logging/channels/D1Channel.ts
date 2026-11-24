import type { LogLevel } from "../../../enums/LogLevel";
import { isAtLeast } from "../../../lib/logLevel";
import type { LogRecord } from "../../../types/LogRecord";
import type { LogChannel } from "../LogChannel";

/** The slice of a D1 database this channel needs. */
export interface D1Database {
  prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } };
}

/**
 * Inserts records into a D1 table (the "database" driver). The table name comes from validated config
 * (`^[a-z_][a-z0-9_]*$`), never from a request; all values are bound parameters.
 * Schema: migrations/0001_create_logs_table.sql.
 */
export class D1Channel implements LogChannel {
  private readonly insertSql: string;

  constructor(
    readonly name: string,
    private readonly database: D1Database | undefined,
    private readonly minimumLevel: LogLevel,
    table: string,
  ) {
    this.insertSql = `INSERT INTO ${table} (timestamp, level, actor, event, location, reason, request_id, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  }

  accepts(level: LogLevel): boolean {
    return this.database !== undefined && isAtLeast(level, this.minimumLevel);
  }

  async write(record: LogRecord): Promise<void> {
    if (!this.database) return;
    await this.database
      .prepare(this.insertSql)
      .bind(
        record.timestamp,
        record.level,
        record.actor,
        record.event,
        record.location,
        record.reason,
        record.requestId,
        JSON.stringify({ message: record.message, context: record.context, exception: record.exception }),
      )
      .run();
  }
}

export function isD1Database(candidate: unknown): candidate is D1Database {
  return typeof candidate === "object" && candidate !== null && "prepare" in candidate;
}
