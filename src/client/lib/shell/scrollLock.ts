import { forceReflow } from "../effects/dom";

let isLocked = false;
let lockedScrollY = 0;

export function isScrollLocked(): boolean {
  return isLocked;
}

/**
 * Locks page scroll by pinning the body with `position: fixed` + a negative `top` (plain `overflow: hidden` resets
 * scrollTop to 0 in Chromium) and restores the real scroll position on unlock.
 *
 * Ordering matters: scrollY MUST be captured before the scroll-lock classes go on (adding overflow:hidden zeroes it).
 * Redundant calls are ignored: closing the menu when it was never open would otherwise schedule a scrollTo(0, 0) that
 * races with the section scroll fired right after.
 */
export function applyScrollLock(on: boolean): void {
  if (on === isLocked) return;
  isLocked = on;
  const scrollY = on ? window.scrollY : lockedScrollY;
  const method = on ? "add" : "remove";
  document.documentElement.classList[method]("scroll-lock");
  document.body.classList[method]("scroll-lock");
  if (on) {
    lockedScrollY = scrollY;
    document.body.style.top = `${-scrollY}px`;
    return;
  }
  document.body.style.top = "";
  // A synchronous reflow so scrollTo below sees the recomputed document height (otherwise it clamps to 0). It must be
  // synchronous: the menu -> modal hand-off re-locks shortly after and an rAF-deferred restore could lose that race.
  forceReflow(document.body);
  // Explicit behavior:"instant" — html's `scroll-behavior: smooth` would otherwise animate the restore from 0.
  window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
}
