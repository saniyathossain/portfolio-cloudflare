import type { LogLevel } from "../../enums/LogLevel";
import type { LogRecord } from "../../types/LogRecord";

/** A destination for log records (a "channel" in Laravel's terms). Implementations must never throw. */
export interface LogChannel {
  readonly name: string;
  accepts(level: LogLevel): boolean;
  write(record: LogRecord): Promise<void>;
}
