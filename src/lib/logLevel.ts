import { LogLevel } from "../enums/LogLevel";

const SEVERITY: Readonly<Record<LogLevel, number>> = {
  [LogLevel.Debug]: 10,
  [LogLevel.Info]: 20,
  [LogLevel.Warn]: 30,
  [LogLevel.Error]: 40,
};

export function isAtLeast(level: LogLevel, minimum: LogLevel): boolean {
  return SEVERITY[level] >= SEVERITY[minimum];
}

export function isAtMost(level: LogLevel, maximum: LogLevel): boolean {
  return SEVERITY[level] <= SEVERITY[maximum];
}

export function parseLogLevel(value: unknown): LogLevel | undefined {
  return Object.values(LogLevel).find((candidate) => candidate === value);
}
