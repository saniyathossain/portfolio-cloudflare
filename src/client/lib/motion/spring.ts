/**
 * Shared rAF-lerp "spring" — settle-toward-target idiom reused by magnetic()/tilt() instead of pulling in Motion One
 * (a 65KB, desktop-only, fine-pointer-gated dependency) for two pointer-follow effects. `stiffness` is the per-frame
 * lerp fraction (higher = snappier); the settle threshold stops the rAF loop once the values are visually at rest
 * instead of looping forever at ~0.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
const SETTLE_THRESHOLD = 0.02;

export interface Spring {
  set(targetX: number, targetY: number): void;
}

export type SpringApply = (element: HTMLElement, currentX: number, currentY: number) => void;

export function makeSpring(element: HTMLElement, apply: SpringApply, stiffness: number): Spring {
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let frame = 0;

  function tick(): void {
    currentX += (targetX - currentX) * stiffness;
    currentY += (targetY - currentY) * stiffness;
    apply(element, currentX, currentY);
    const unsettled = Math.abs(targetX - currentX) > SETTLE_THRESHOLD || Math.abs(targetY - currentY) > SETTLE_THRESHOLD;
    frame = unsettled ? requestAnimationFrame(tick) : 0;
  }

  return {
    set(nextX, nextY) {
      targetX = nextX;
      targetY = nextY;
      if (!frame) frame = requestAnimationFrame(tick);
    },
  };
}
