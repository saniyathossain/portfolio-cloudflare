import type { LogLevel } from "../../../enums/LogLevel";
import { isAtLeast, isAtMost } from "../../../lib/logLevel";
import type { LogRecord } from "../../../types/LogRecord";
import type { LogChannel } from "../LogChannel";

export type ConsoleStream = "stdout" | "stderr";

export interface ConsoleSink {
  log(line: string): void;
  error(line: string): void;
}

/** Writes one JSON line per record to stdout or stderr (picked up by `wrangler tail` and Workers Logs). */
export class ConsoleChannel implements LogChannel {
  constructor(
    readonly name: string,
    private readonly stream: ConsoleStream,
    private readonly minimumLevel: LogLevel,
    private readonly maximumLevel: LogLevel | undefined,
    private readonly sink: ConsoleSink = console,
  ) {}

  accepts(level: LogLevel): boolean {
    if (!isAtLeast(level, this.minimumLevel)) return false;
    return this.maximumLevel === undefined || isAtMost(level, this.maximumLevel);
  }

  write(record: LogRecord): Promise<void> {
    const line = JSON.stringify({ channel: this.name, ...record });
    if (this.stream === "stderr") this.sink.error(line);
    else this.sink.log(line);
    return Promise.resolve();
  }
}
