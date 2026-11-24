import type { ExceptionDetails } from "../../types/LogRecord";

/** Turns anything that was thrown into a plain, serialisable description. Never throws itself. */
export function describeError(thrown: unknown, includeStackTrace: boolean): ExceptionDetails {
  if (thrown instanceof Error) {
    const base = { name: thrown.name, message: thrown.message };
    return includeStackTrace && thrown.stack ? { ...base, stack: thrown.stack } : base;
  }
  if (typeof thrown === "string") return { name: "NonErrorThrown", message: thrown };
  try {
    return { name: "NonErrorThrown", message: JSON.stringify(thrown) };
  } catch {
    return { name: "NonErrorThrown", message: "unserialisable value" };
  }
}
