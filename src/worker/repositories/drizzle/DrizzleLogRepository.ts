import type { LogRecord } from "../../../types/LogRecord";
import { logs } from "../../database/schema";
import type { Database } from "../../database/types";
import type { LogRepository } from "../LogRepository";

/** Inserts one row per record; all values are bound parameters (schema: migrations/0001_create_logs_table.sql). */
export class DrizzleLogRepository implements LogRepository {
  constructor(private readonly database: Database) {}

  async append(record: LogRecord): Promise<void> {
    await this.database.insert(logs).values({
      timestamp: record.timestamp,
      level: record.level,
      actor: record.actor,
      event: record.event,
      location: record.location,
      reason: record.reason,
      requestId: record.requestId,
      payload: JSON.stringify({ message: record.message, context: record.context, exception: record.exception }),
    });
  }
}
