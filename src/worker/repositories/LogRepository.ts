import type { LogRecord } from "../../types/LogRecord";

/** Where log records are persisted by the `database` channel. */
export interface LogRepository {
  append(record: LogRecord): Promise<void>;
}
