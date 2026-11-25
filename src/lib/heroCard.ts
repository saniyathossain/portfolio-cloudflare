/** Pure logic for the hero "Now" card carousel (no DOM, no framework). */

export type SwapDirection = "next" | "prev";

/** Wrap-around index step: `direction` is +1 (next) or -1 (previous). */
export function stepIndex(current: number, direction: number, total: number): number {
  if (total <= 0) return 0;
  return (((current + direction) % total) + total) % total;
}

export function swapDirectionOf(direction: number): SwapDirection {
  return direction > 0 ? "next" : "prev";
}

/** A card's tint name as written in the CSS (`data-tint`); unknown names fall back to `fallbackTint`. */
export function resolveTintName(tintName: string, tintNames: readonly string[], fallbackTint: string): string {
  if (tintNames.includes(tintName)) return tintName;
  if (tintNames.includes(fallbackTint)) return fallbackTint;
  throw new Error(`Hero card tint "${tintName}" has no definition and no "${fallbackTint}" fallback`);
}
