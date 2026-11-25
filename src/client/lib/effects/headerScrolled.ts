const SCROLLED_CLASS = "is-scrolled";

/**
 * Header glass intensifies once it floats over page content (past the very top): toggles `is-scrolled` directly on the
 * `.glass-pill`. rAF-coalesced — one threshold check per frame, not one per scroll event.
 */
export function setupHeaderScrolled(header: Element, thresholdPx: number): void {
  let frame = 0;
  const check = (): void => {
    frame = 0;
    header.classList.toggle(SCROLLED_CLASS, window.scrollY > thresholdPx);
  };
  const schedule = (): void => {
    if (!frame) frame = requestAnimationFrame(check);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  check();
}
