import type { LogChannel } from "../LogChannel";

/** Drops everything (Laravel's `null` driver) — handy for tests and for silencing a noisy environment. */
export class NullChannel implements LogChannel {
  constructor(readonly name: string) {}

  accepts(): boolean {
    return false;
  }

  write(): Promise<void> {
    return Promise.resolve();
  }
}
