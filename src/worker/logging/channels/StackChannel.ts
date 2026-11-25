import type { LogLevel } from "../../../enums/LogLevel";
import type { LogRecord } from "../../../types/LogRecord";
import type { LogChannel } from "../LogChannel";

/** Fans a record out to several channels; one failing channel never stops the others. */
export class StackChannel implements LogChannel {
  constructor(
    readonly name: string,
    private readonly members: readonly LogChannel[],
  ) {}

  accepts(level: LogLevel): boolean {
    return this.members.some((member) => member.accepts(level));
  }

  async write(record: LogRecord): Promise<void> {
    const writes = this.members
      .filter((member) => member.accepts(record.level))
      .map((member) => member.write(record).catch(() => undefined));
    await Promise.all(writes);
  }
}
