const REDACTED = "[redacted]";
const MAX_DEPTH = 4;

export interface SanitizeOptions {
  readonly redactedKeys: readonly string[];
  readonly maxStringLength: number;
}

function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}…[+${text.length - maxLength}]`;
}

function sanitizeValue(value: unknown, options: SanitizeOptions, depth: number): unknown {
  if (typeof value === "string") return truncate(value, options.maxStringLength);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) return value.map((item: unknown) => sanitizeValue(item, options, depth + 1));
  return sanitizeContext(value as Readonly<Record<string, unknown>>, options, depth + 1);
}

/** Redacts sensitive keys, truncates long strings and caps nesting, so a log line can never leak or balloon. */
export function sanitizeContext(
  context: Readonly<Record<string, unknown>>,
  options: SanitizeOptions,
  depth = 0,
): Record<string, unknown> {
  const redactedKeys = new Set(options.redactedKeys.map((key) => key.toLowerCase()));
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = redactedKeys.has(key.toLowerCase()) ? REDACTED : sanitizeValue(value, options, depth);
  }
  return sanitized;
}
