import type { LogLevel } from "../enums/LogLevel";

export interface ExceptionDetails {
  readonly name: string;
  readonly message: string;
  /** Present only when `includeStackTrace` is on; never shown to visitors. */
  readonly stack?: string;
}

/** One log line = the 5 W's (doc 54 §6) plus the request correlation id. */
export interface LogRecord {
  /** When */
  readonly timestamp: string;
  readonly level: LogLevel;
  /** Who: the component that emitted it (never PII). */
  readonly actor: string;
  /** What: stable snake_case event id, plus a human message. */
  readonly event: string;
  readonly message: string;
  /** Where: route or file. */
  readonly location: string;
  /** Why: cause / outcome summary. */
  readonly reason: string;
  /** Correlates a log line with the reference id shown on the visitor's error page. */
  readonly requestId: string;
  readonly context: Readonly<Record<string, unknown>>;
  readonly exception?: ExceptionDetails;
}

/** What callers provide; the logger fills in the timestamp, level and correlation id. */
export interface LogEntry {
  readonly event: string;
  readonly message?: string;
  readonly location?: string;
  readonly reason?: string;
  readonly context?: Readonly<Record<string, unknown>>;
}
