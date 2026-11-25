/** Timing and easing for one height transition (values come from `ui.json` → `experienceAccordion`). */
export interface HeightAnimationOptions {
  readonly toHeight: string;
  readonly durationMs: number;
  readonly easing: string;
  /** Extra wait past `durationMs` before the fallback timer force-finishes the transition. */
  readonly settleMarginMs: number;
  readonly onDone: () => void;
}

/**
 * `_heightTimer` expando on the panel while a transition runs. The pill-row reflow code (`pillReflow.ts`) reads it to
 * avoid pinning or locking a panel that is mid-animation, so it is kept in sync here.
 */
interface HeightTimedPanel extends HTMLElement {
  _heightTimer?: number;
}

interface RunningAnimation {
  readonly timerId: number;
  readonly onTransitionEnd: (event: TransitionEvent) => void;
}

/** Per-panel bookkeeping, kept in a WeakMap so concurrent accordion rows never share state. */
const runningAnimations = new WeakMap<HTMLElement, RunningAnimation>();

export function cancelHeightAnimation(panel: HTMLElement): void {
  const running = runningAnimations.get(panel);
  if (!running) return;
  clearTimeout(running.timerId);
  panel.removeEventListener("transitionend", running.onTransitionEnd);
  runningAnimations.delete(panel);
  delete (panel as HeightTimedPanel)._heightTimer;
}

/**
 * Open/close height-transition driver. `transitionend` plus a timeout fallback guarantees `onDone` always fires even if
 * the panel is hidden or the transition is interrupted; otherwise the panel's inline height/overflow/transition styles
 * would stay stuck.
 */
export function animateHeight(panel: HTMLElement, options: HeightAnimationOptions): void {
  cancelHeightAnimation(panel);

  // Promote the inner content to its own compositor layer for the animation: rasterised once, then the panel's
  // overflow:hidden just clips the cached layer instead of repainting the glossy content every frame (Safari jank).
  const layer = panel.firstElementChild instanceof HTMLElement ? panel.firstElementChild : null;

  const finish = (): void => {
    cancelHeightAnimation(panel);
    if (layer) {
      layer.style.willChange = "";
      layer.style.transform = "";
    }
    options.onDone();
  };
  const onTransitionEnd = (event: TransitionEvent): void => {
    if (event.target === panel && event.propertyName === "height") finish();
  };
  panel.addEventListener("transitionend", onTransitionEnd);
  const timerId = window.setTimeout(finish, options.durationMs + options.settleMarginMs);
  runningAnimations.set(panel, { timerId, onTransitionEnd });
  (panel as HeightTimedPanel)._heightTimer = timerId;

  // translateZ(0), not just will-change (Safari treats will-change as a hint). Double rAF: promoting the layer and
  // starting the transition in the same callback does not guarantee the layer was rasterised first.
  requestAnimationFrame(() => {
    if (layer) {
      layer.style.willChange = "transform";
      layer.style.transform = "translateZ(0)";
    }
    requestAnimationFrame(() => {
      panel.style.transition = `height ${String(options.durationMs)}ms ${options.easing}`;
      panel.style.height = options.toHeight;
    });
  });
}
