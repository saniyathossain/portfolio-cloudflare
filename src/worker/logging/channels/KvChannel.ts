import type { LogLevel } from "../../../enums/LogLevel";
import { isAtLeast } from "../../../lib/logLevel";
import type { LogRecord } from "../../../types/LogRecord";
import type { LogChannel } from "../LogChannel";

/** The slice of a Workers KV namespace this channel needs. */
export interface KvStore {
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface KvChannelOptions {
  readonly keyPrefix: string;
  readonly ttlSeconds: number;
}

/** Persists records to a KV namespace with a TTL — the "filesystem" driver of a serverless runtime. */
export class KvChannel implements LogChannel {
  constructor(
    readonly name: string,
    private readonly store: KvStore | undefined,
    private readonly minimumLevel: LogLevel,
    private readonly options: KvChannelOptions,
  ) {}

  accepts(level: LogLevel): boolean {
    return this.store !== undefined && isAtLeast(level, this.minimumLevel);
  }

  async write(record: LogRecord): Promise<void> {
    if (!this.store) return;
    const key = `${this.options.keyPrefix}${record.timestamp}:${record.requestId}:${record.event}`;
    await this.store.put(key, JSON.stringify(record), { expirationTtl: this.options.ttlSeconds });
  }
}

export function isKvStore(candidate: unknown): candidate is KvStore {
  return typeof candidate === "object" && candidate !== null && "put" in candidate;
}
