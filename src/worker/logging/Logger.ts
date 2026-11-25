import { LogLevel } from "../../enums/LogLevel";
import { isAtLeast } from "../../lib/logLevel";
import type { LogEntry, LogRecord } from "../../types/LogRecord";
import { describeError } from "./describeError";
import type { LogChannel } from "./LogChannel";
import { sanitizeContext, type SanitizeOptions } from "./sanitizeContext";

export interface LoggerOptions extends SanitizeOptions {
  readonly actor: string;
  readonly requestId: string;
  readonly includeStackTrace: boolean;
  /** Extra floor applied on top of every channel's own level (the LOG_LEVEL Worker var). */
  readonly minimumLevel?: LogLevel;
  readonly clock?: () => Date;
}

/**
 * Builds 5W records and hands them to a channel without ever blocking or throwing.
 * Writes are collected so the Worker can `ctx.waitUntil(logger.drain())` and answer the visitor first.
 */
export class Logger {
  private readonly pendingWrites: Promise<void>[];

  constructor(
    private readonly channel: LogChannel,
    private readonly options: LoggerOptions,
    pendingWrites: Promise<void>[] = [],
  ) {
    this.pendingWrites = pendingWrites;
  }

  get requestId(): string {
    return this.options.requestId;
  }

  /** Same channel and pending-write list, different actor (e.g. "ContactController"). */
  forActor(actor: string): Logger {
    return new Logger(this.channel, { ...this.options, actor }, this.pendingWrites);
  }

  debug(entry: LogEntry): void {
    this.record(LogLevel.Debug, entry);
  }

  info(entry: LogEntry): void {
    this.record(LogLevel.Info, entry);
  }

  warn(entry: LogEntry): void {
    this.record(LogLevel.Warn, entry);
  }

  error(entry: LogEntry): void {
    this.record(LogLevel.Error, entry);
  }

  /** Logs an error with its exception details (stack included only when configured). Details stay in the log. */
  exception(entry: LogEntry, thrown: unknown): void {
    this.record(LogLevel.Error, entry, describeError(thrown, this.options.includeStackTrace));
  }

  /** Resolves when every write started so far has settled. */
  async drain(): Promise<void> {
    await Promise.allSettled([...this.pendingWrites]);
  }

  private record(level: LogLevel, entry: LogEntry, exception?: LogRecord["exception"]): void {
    if (this.options.minimumLevel && !isAtLeast(level, this.options.minimumLevel)) return;
    if (!this.channel.accepts(level)) return;
    const clock = this.options.clock ?? (() => new Date());
    const logRecord: LogRecord = {
      timestamp: clock().toISOString(),
      level,
      actor: this.options.actor,
      event: entry.event,
      message: entry.message ?? entry.event,
      location: entry.location ?? "",
      reason: entry.reason ?? "",
      requestId: this.options.requestId,
      context: sanitizeContext(entry.context ?? {}, this.options),
      ...(exception ? { exception } : {}),
    };
    this.pendingWrites.push(this.safeWrite(logRecord));
  }

  private async safeWrite(logRecord: LogRecord): Promise<void> {
    try {
      await this.channel.write(logRecord);
    } catch {
      // Logging must never break the request it describes.
    }
  }
}
