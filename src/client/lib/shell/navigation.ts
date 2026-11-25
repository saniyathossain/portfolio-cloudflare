import { shell } from "../../../content/ui.json";
import { scrollTargetTop, sectionIdFromHash } from "../../../lib/navigation";
import { setLocationHash } from "../../../lib/browser/scroll";
import { shellStore } from "../../../stores/ui";
import { prefersReducedMotion } from "../effects/constants";
import { isScrollLocked } from "./scrollLock";

interface ScrollOptions {
  readonly behavior?: ScrollBehavior;
  readonly updateHash?: boolean;
  readonly hashId?: string;
}

let warpTimer = 0;

/**
 * Brief "liquid glass" blur/refraction pulse across the scrolling content while a nav-triggered smooth scroll is in
 * flight — filter/transform only. Scoped to #main (blurring the fixed header made it look like it vanished). Cleared on
 * the native `scrollend` event with a timeout fallback so it can never get stuck on.
 */
function liquidWarp(): void {
  const root = document.getElementById("main");
  if (!root || prefersReducedMotion()) return;
  root.classList.add("is-liquid-warp");
  clearTimeout(warpTimer);
  const done = (): void => {
    root.classList.remove("is-liquid-warp");
    window.removeEventListener("scrollend", done);
  };
  window.addEventListener("scrollend", done, { once: true });
  warpTimer = window.setTimeout(done, shell.liquidWarpMs);
}

function scrollToElement(element: HTMLElement | null, options: ScrollOptions = {}): void {
  if (!element) return;
  const { behavior = "smooth", updateHash = true, hashId = element.id } = options;
  liquidWarp();
  window.scrollTo({
    top: scrollTargetTop(element.getBoundingClientRect().top, window.scrollY, shell.scrollOffsetPx),
    behavior,
  });
  if (updateHash) setLocationHash(hashId);
}

export function scrollToSection(sectionId: string): void {
  scrollToElement(document.getElementById(sectionId), { hashId: sectionId });
}

function restoreHashScroll(): void {
  const sectionId = sectionIdFromHash(location.hash);
  if (!sectionId) return;
  scrollToElement(document.getElementById(sectionId), { behavior: "instant", updateHash: false });
}

/** Restores the scroll position for a deep-linked `#section` once the page is ready, and on every hashchange. */
export function setupHashNavigation(): void {
  const onHashChange = (): void => {
    const { menuOpen, modalOpen } = shellStore.get();
    if (isScrollLocked() || menuOpen || modalOpen) return;
    restoreHashScroll();
  };
  window.addEventListener("hashchange", onHashChange);
  const afterReady = (): void => {
    requestAnimationFrame(() => {
      requestAnimationFrame(onHashChange);
    });
  };
  window.addEventListener("portfolio-ready", afterReady, { once: true });
  if (!document.documentElement.classList.contains("is-loading")) afterReady();
}
