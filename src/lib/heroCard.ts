/** Pure logic for the hero "Now" card carousel (no DOM, no framework). */

export interface TintPair {
  readonly tint: string;
  readonly ink: string;
}

export type SwapDirection = "next" | "prev";

/** Wrap-around index step: `direction` is +1 (next) or -1 (previous). */
export function stepIndex(current: number, direction: number, total: number): number {
  if (total <= 0) return 0;
  return (((current + direction) % total) + total) % total;
}

export function swapDirectionOf(direction: number): SwapDirection {
  return direction > 0 ? "next" : "prev";
}

/** CSS custom properties for a card's tint; unknown names fall back to `fallbackTint`. */
export function tintCustomProperties(
  tintName: string,
  tints: Readonly<Record<string, TintPair>>,
  fallbackTint: string,
): Record<"--tint" | "--tint-ink", string> {
  const pair = tints[tintName] ?? tints[fallbackTint];
  if (!pair) throw new Error(`Hero card tint "${tintName}" has no definition and no "${fallbackTint}" fallback`);
  return { "--tint": pair.tint, "--tint-ink": pair.ink };
}
