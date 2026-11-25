/**
 * Touch brand-pill reveal — gated on html.touch-pills (boot.js). Mutually exclusive with pillFlip (fine-pointer). Opens
 * one pill; auto-closes on other-pill / outside tap / scroll / timer.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import type { ReflowPanelController } from "./pillReflow";

const AUTO_CLOSE_MS = 2800;

export function pillTap(reflowPanel: ReflowPanelController): void {
  if (!document.documentElement.classList.contains("touch-pills")) return;
  const rootStyle = getComputedStyle(document.documentElement);
  const readMs = (name: string, fallback: number): number => {
    const seconds = parseFloat(rootStyle.getPropertyValue(name));
    return Number.isFinite(seconds) ? Math.round(seconds * 1000) : fallback;
  };
  const openMs = readMs("--dur-pill-expand", 480);
  const closeMsFlip = readMs("--dur-pill-flip-close", 380);
  let openPill: HTMLElement | null = null;
  let timer = 0;

  /** lock → mutate → measure → glide, in that order, for the row that holds `pill`. */
  function reflowAround(row: HTMLElement | null, mutate: () => void, durationMs: number): void {
    if (row) reflowPanel.lock(row);
    mutate();
    if (!row) return;
    const toHeight = reflowPanel.measureTarget(row);
    reflowPanel.reflow(row, durationMs, toHeight);
  }

  function clearTimer(): void {
    if (!timer) return;
    clearTimeout(timer);
    timer = 0;
  }

  function close(): void {
    clearTimer();
    if (!openPill) return;
    const pill = openPill;
    const row = pill.parentElement;
    openPill = null;
    reflowAround(
      row,
      () => {
        pill.classList.remove("is-open");
      },
      closeMsFlip,
    );
  }

  function open(pill: HTMLElement): void {
    if (openPill && openPill !== pill) {
      const previous = openPill;
      reflowAround(
        previous.parentElement,
        () => {
          previous.classList.remove("is-open");
        },
        closeMsFlip,
      );
    }
    openPill = pill;
    reflowAround(
      pill.parentElement,
      () => {
        pill.classList.add("is-open");
      },
      openMs,
    );
    clearTimer();
    timer = window.setTimeout(close, AUTO_CLOSE_MS);
  }

  document.addEventListener("click", (event) => {
    const pill = event.target instanceof Element ? event.target.closest<HTMLElement>(".brand-pill") : null;
    if (pill?.parentElement?.classList.contains("pill-row")) {
      event.preventDefault();
      if (openPill === pill) close();
      else open(pill);
      return;
    }
    if (openPill) close();
  });
  window.addEventListener("scroll", close, { passive: true });
}
