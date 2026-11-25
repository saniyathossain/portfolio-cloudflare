/** Returns `value` unless it is falsy (undefined, null or ""), in which case `fallback` — the legacy `a || b` idiom. */
export function orDefault<T extends string | object>(value: T | null | undefined, fallback: T): T {
  if (!value) return fallback;
  return value;
}

/** Forces a synchronous layout (reflow) by reading a layout property; the value itself is irrelevant. */
export function forceReflow(element: HTMLElement): number {
  return element.offsetHeight;
}
