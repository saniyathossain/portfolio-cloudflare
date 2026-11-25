import type { LogLevel } from "../../../enums/LogLevel";
import { isAtLeast } from "../../../lib/logLevel";
import type { LogRecord } from "../../../types/LogRecord";
import type { LogRepository } from "../../repositories/LogRepository";
import type { LogChannel } from "../LogChannel";

/**
 * Persists records through a `LogRepository` (the "database" driver). The repository is resolved on the first write, not
 * when the logger is built, so the (hot) per-request logger never loads the ORM; with no database it is a no-op.
 */
export class DatabaseChannel implements LogChannel {
  private repository: Promise<LogRepository | undefined> | undefined;

  constructor(
    readonly name: string,
    private readonly resolveRepository: () => Promise<LogRepository | undefined>,
    private readonly minimumLevel: LogLevel,
  ) {}

  accepts(level: LogLevel): boolean {
    return isAtLeast(level, this.minimumLevel);
  }

  async write(record: LogRecord): Promise<void> {
    this.repository ??= this.resolveRepository();
    await (await this.repository)?.append(record);
  }
}
