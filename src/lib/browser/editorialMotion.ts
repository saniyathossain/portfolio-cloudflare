import { easeOutCubicOvershoot, pickLensIndex } from "../editorial";
import type { UiConfig } from "../../types/UiConfig";

/** Imperative DOM motion for the Editorial island: kept out of the component so it stays a thin view. */
export type EditorialConfig = UiConfig["editorial"];

export const PANEL_ID = "editorial-panel";
const LIST_SELECTOR = ".editorial-list";
const TAB_BUTTON_SELECTOR = ".editorial-tabs__btn";
const TAB_COUNT_SELECTOR = ".editorial-tabs__count";
const TITLE_SELECTOR = ".editorial-row__title";
const ROW_LINK_SELECTOR = ".editorial-row__link";
const ACTIVE_CLASS = "is-active";
const TRAVELING_CLASS = "is-traveling";
const PRESSING_CLASS = "is-pressing";
const PRESSED_CLASS = "is-pressed";
const PERCENT_DECIMALS = 1;
const TILT_DECIMALS = 2;
const MILLISECONDS_PER_SECOND = 1000;

export function prefersReducedMotion(config: EditorialConfig): boolean {
  return window.matchMedia(config.reducedMotionQuery).matches;
}

function closestElement(target: EventTarget | null, selector: string): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(selector) : null;
}

const countedElements = new WeakSet<HTMLElement>();

/** Rolls a tab count up from zero once per element (the same motion language as the stat counters). */
function animateCount(config: EditorialConfig, element: HTMLElement, target: number): void {
  if (prefersReducedMotion(config) || countedElements.has(element)) return;
  countedElements.add(element);
  const start = performance.now();
  // Write into the existing text node so the framework's reference to it stays valid.
  const textNode = element.firstChild instanceof Text ? element.firstChild : null;
  const run = (now: number): void => {
    const progress = Math.min((now - start) / config.motionMs.countUp, 1);
    const text = `${Math.round(easeOutCubicOvershoot(progress) * target)}`;
    if (textNode) textNode.data = text;
    else element.textContent = text;
    if (progress < 1) requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
}

/**
 * One-shot: the first time the dock is at least `countRevealThreshold` visible, roll every tab count up.
 * Returns a disposer.
 */
export function bindTabCountReveal(config: EditorialConfig, dock: HTMLElement, counts: readonly number[]): () => void {
  if (prefersReducedMotion(config) || !("IntersectionObserver" in window)) return () => undefined;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        tabButtons(dock).forEach((button, index) => {
          const countElement = button.querySelector<HTMLElement>(TAB_COUNT_SELECTOR);
          const target = counts[index];
          if (countElement && target !== undefined) animateCount(config, countElement, target);
        });
        observer.disconnect();
      }
    },
    { threshold: config.countRevealThreshold },
  );
  observer.observe(dock);
  return () => {
    observer.disconnect();
  };
}

/**
 * Word-split + blur crossfade of each row title, reusing blur-reveal's technique. blur-reveal only scans the
 * DOM once, so rows rendered later (and re-rendered on filter swaps) need a direct call.
 */
function cascadeTitle(element: HTMLElement): void {
  const blurReveal = window.blurReveal;
  if (!blurReveal || element.classList.contains("blur-reveal")) return;
  blurReveal.split(element);
  if (blurReveal.reduced) {
    element.classList.add("is-visible");
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      blurReveal.reveal(element);
    });
  });
}

export function cascadeTitles(root: HTMLElement | null): void {
  root?.querySelectorAll<HTMLElement>(TITLE_SELECTOR).forEach(cascadeTitle);
}

interface Spring {
  set(nextX: number, nextY: number): void;
}

/** rAF-lerp settle; the loop stops itself once both axes are within the threshold of the target. */
function makeSpring(
  apply: (currentX: number, currentY: number) => void,
  stiffness: number,
  settleThreshold: number,
): Spring {
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let frame = 0;
  const tick = (): void => {
    currentX += (targetX - currentX) * stiffness;
    currentY += (targetY - currentY) * stiffness;
    apply(currentX, currentY);
    const unsettled = Math.abs(targetX - currentX) > settleThreshold || Math.abs(targetY - currentY) > settleThreshold;
    frame = unsettled ? requestAnimationFrame(tick) : 0;
  };
  return {
    set(nextX, nextY) {
      targetX = nextX;
      targetY = nextY;
      if (!frame) frame = requestAnimationFrame(tick);
    },
  };
}

let rowTiltBound = false;

/**
 * Cursor tilt on article rows: one delegated pointermove listener writing CSS custom properties only (never
 * transform), fed through a per-element spring. Fine pointers only, never under reduced motion. Bound once per
 * page; the listeners are page-lifetime on purpose (the section never unmounts).
 */
export function bindRowTilt(config: EditorialConfig): void {
  const isTiltEnabled = window.matchMedia(config.finePointerQuery).matches && !prefersReducedMotion(config);
  if (!isTiltEnabled || rowTiltBound) return;
  rowTiltBound = true;
  const springs = new WeakMap<HTMLElement, Spring>();
  const springFor = (element: HTMLElement): Spring => {
    const cached = springs.get(element);
    if (cached) return cached;
    const spring = makeSpring(
      (tiltX, tiltY) => {
        element.style.setProperty("--tilt-x", `${tiltX.toFixed(TILT_DECIMALS)}deg`);
        element.style.setProperty("--tilt-y", `${tiltY.toFixed(TILT_DECIMALS)}deg`);
      },
      config.tilt.stiffness,
      config.tilt.settleThreshold,
    );
    springs.set(element, spring);
    return spring;
  };
  let frame = 0;
  let pending: PointerEvent | null = null;
  let current: HTMLElement | null = null;
  const apply = (): void => {
    frame = 0;
    if (!pending || !current) return;
    const rect = current.getBoundingClientRect();
    const offsetX = (pending.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (pending.clientY - rect.top) / rect.height - 0.5;
    springFor(current).set(offsetX * config.tilt.maxDeg, -offsetY * config.tilt.maxDeg);
  };
  document.addEventListener(
    "pointermove",
    (event) => {
      const link = closestElement(event.target, ROW_LINK_SELECTOR);
      if (!link) return;
      current = link;
      pending = event;
      if (!frame) frame = requestAnimationFrame(apply);
    },
    { passive: true },
  );
  document.addEventListener(
    "pointerout",
    (event) => {
      const link = closestElement(event.target, ROW_LINK_SELECTOR);
      if (!link) return;
      if (event.relatedTarget instanceof Node && link.contains(event.relatedTarget)) return;
      springFor(link).set(0, 0);
    },
    { passive: true },
  );
}

function readEase(config: EditorialConfig): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--ease-pill-flip").trim();
  return value || config.fallbackEase;
}

function readReflowMs(config: EditorialConfig): number {
  const seconds = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dur-pill-panel-reflow"));
  return Number.isFinite(seconds) ? Math.round(seconds * MILLISECONDS_PER_SECOND) : config.motionMs.lensTravel;
}

interface HeightAnimation {
  timer: number;
  onEnd: (event: TransitionEvent) => void;
}
/** Per-panel bookkeeping lives here, not on the element, so nothing is attached to it as an expando. */
const heightAnimations = new WeakMap<HTMLElement, HeightAnimation>();
const lastReflowHeights = new WeakMap<HTMLElement, number>();

function cancelHeightAnimation(panel: HTMLElement): void {
  const running = heightAnimations.get(panel);
  if (!running) return;
  window.clearTimeout(running.timer);
  panel.removeEventListener("transitionend", running.onEnd);
  heightAnimations.delete(panel);
}

function animateHeight(
  config: EditorialConfig,
  panel: HTMLElement,
  toHeight: string,
  durationMs: number,
  onDone: () => void,
): void {
  cancelHeightAnimation(panel);
  const inner = panel.querySelector<HTMLElement>(LIST_SELECTOR);
  const finish = (): void => {
    cancelHeightAnimation(panel);
    if (inner) {
      inner.style.willChange = "";
      inner.style.transform = "";
    }
    onDone();
  };
  const onEnd = (event: TransitionEvent): void => {
    if (event.propertyName === "height") finish();
  };
  panel.addEventListener("transitionend", onEnd);
  heightAnimations.set(panel, { timer: window.setTimeout(finish, durationMs + config.settleMarginMs), onEnd });
  requestAnimationFrame(() => {
    if (inner) {
      inner.style.willChange = "transform";
      inner.style.transform = "translateZ(0)";
    }
    panel.style.transition = `height ${durationMs}ms ${readEase(config)}`;
    panel.style.height = toHeight;
  });
}

function animatePanelReflow(config: EditorialConfig, panel: HTMLElement, onSettled?: () => void): void {
  const from = panel.offsetHeight;
  panel.style.overflow = "hidden";
  panel.style.height = `${from}px`;
  requestAnimationFrame(() => {
    const target = panel.scrollHeight;
    const settle = (): void => {
      panel.style.height = "";
      panel.style.overflow = "";
      panel.style.transition = "";
      lastReflowHeights.set(panel, panel.scrollHeight);
      onSettled?.();
    };
    if (Math.abs(from - target) < config.reflowTolerancePx) {
      settle();
      return;
    }
    animateHeight(config, panel, `${target}px`, readReflowMs(config), settle);
  });
}

/** Animates the panel to its new natural height (skipped when unchanged, or under reduced motion). */
export function reflowEditorialPanel(config: EditorialConfig, onSettled?: () => void): void {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) {
    onSettled?.();
    return;
  }
  const to = panel.scrollHeight;
  const lastHeight = lastReflowHeights.get(panel);
  if (lastHeight !== undefined && Math.abs(lastHeight - to) < config.reflowTolerancePx) {
    onSettled?.();
    return;
  }
  if (prefersReducedMotion(config)) {
    lastReflowHeights.set(panel, to);
    onSettled?.();
    return;
  }
  animatePanelReflow(config, panel, onSettled);
}

function tabButtons(tabs: HTMLElement): HTMLElement[] {
  return Array.from(tabs.querySelectorAll<HTMLElement>(TAB_BUTTON_SELECTOR));
}

interface LensState {
  lastX?: number;
  lastY?: number;
  travelTimer?: number;
}
const lensStates = new WeakMap<HTMLElement, LensState>();

function lensStateFor(tabs: HTMLElement): LensState {
  const existing = lensStates.get(tabs);
  if (existing) return existing;
  const created: LensState = {};
  lensStates.set(tabs, created);
  return created;
}

function markLensTravel(config: EditorialConfig, tabs: HTMLElement, left: number, top: number): void {
  const state = lensStateFor(tabs);
  const moved =
    state.lastX !== undefined &&
    (Math.abs(left - state.lastX) > config.lensTravelThresholdPx ||
      Math.abs(top - (state.lastY ?? 0)) > config.lensTravelThresholdPx);
  if (!prefersReducedMotion(config) && moved) {
    tabs.classList.add(TRAVELING_CLASS);
    window.clearTimeout(state.travelTimer);
    state.travelTimer = window.setTimeout(() => {
      tabs.classList.remove(TRAVELING_CLASS);
    }, config.motionMs.lensTravel);
  }
  state.lastX = left;
  state.lastY = top;
}

function positionLens(config: EditorialConfig, tabs: HTMLElement, button: HTMLElement): void {
  // Read phase: every geometry/computed-style read lands before any style write, otherwise the write forces a
  // synchronous layout flush to serve the next read. Layout-box coords (not getBoundingClientRect) so the
  // active scale() does not skew the lens.
  const tint = getComputedStyle(button).getPropertyValue("--tint").trim();
  const left = button.offsetLeft;
  const top = button.offsetTop;
  const width = button.offsetWidth;
  const height = button.offsetHeight;

  // Write phase: no reads below this point.
  if (tint) tabs.style.setProperty("--tab-tint", tint);
  markLensTravel(config, tabs, left, top);
  tabs.style.setProperty("--tab-x", `${left}px`);
  tabs.style.setProperty("--tab-y", `${top}px`);
  tabs.style.setProperty("--tab-w", `${width}px`);
  tabs.style.setProperty("--tab-h", `${height}px`);
  tabs.style.setProperty("--tab-o", "1");
}

/** Moves the glass lens under the hovered/focused tab, else the active one. No-op while the tabs are hidden. */
export function syncTabLens(
  config: EditorialConfig,
  tabs: HTMLElement,
  isSearchMode: boolean,
  hoverIndex?: number,
): void {
  if (isSearchMode || getComputedStyle(tabs).visibility === "hidden") return;
  const buttons = tabButtons(tabs);
  if (!buttons.length) return;
  const activeIndex = buttons.findIndex((button) => button.classList.contains(ACTIVE_CLASS));
  const button = buttons[pickLensIndex(activeIndex, hoverIndex)];
  if (!button?.offsetWidth) {
    tabs.style.setProperty("--tab-o", "0");
    return;
  }
  positionLens(config, tabs, button);
}

function bindLensPress(tabs: HTMLElement): () => void {
  const press = (event: PointerEvent): void => {
    const button = closestElement(event.target, TAB_BUTTON_SELECTOR);
    if (!button) return;
    tabs.classList.add(PRESSING_CLASS);
    const rect = button.getBoundingClientRect();
    const percentX = ((event.clientX - rect.left) / rect.width) * 100;
    const percentY = ((event.clientY - rect.top) / rect.height) * 100;
    button.style.setProperty("--tx", `${percentX.toFixed(PERCENT_DECIMALS)}%`);
    button.style.setProperty("--ty", `${percentY.toFixed(PERCENT_DECIMALS)}%`);
    button.classList.add(PRESSED_CLASS);
  };
  const release = (event: Event): void => {
    closestElement(event.target, TAB_BUTTON_SELECTOR)?.classList.remove(PRESSED_CLASS);
    tabs.classList.remove(PRESSING_CLASS);
  };
  const releaseTypes = ["pointerup", "pointerleave", "pointercancel"];
  tabs.addEventListener("pointerdown", press, { passive: true });
  for (const type of releaseTypes) tabs.addEventListener(type, release, { passive: true });
  return () => {
    tabs.removeEventListener("pointerdown", press);
    for (const type of releaseTypes) tabs.removeEventListener(type, release);
  };
}

function bindLensHover(tabs: HTMLElement, onHover: (index: number) => void): () => void {
  const hoverButton = (event: Event): void => {
    const button = closestElement(event.target, TAB_BUTTON_SELECTOR);
    if (!button || !tabs.contains(button)) return;
    onHover(tabButtons(tabs).indexOf(button));
  };
  const leave = (): void => {
    onHover(-1);
  };
  const focusOut = (event: FocusEvent): void => {
    if (event.relatedTarget instanceof Node && tabs.contains(event.relatedTarget)) return;
    onHover(-1);
  };
  tabs.addEventListener("pointerenter", hoverButton, true);
  tabs.addEventListener("focusin", hoverButton);
  tabs.addEventListener("pointerleave", leave);
  tabs.addEventListener("focusout", focusOut);
  return () => {
    tabs.removeEventListener("pointerenter", hoverButton, true);
    tabs.removeEventListener("focusin", hoverButton);
    tabs.removeEventListener("pointerleave", leave);
    tabs.removeEventListener("focusout", focusOut);
  };
}

/**
 * Wires the tab list's lens: press ripple, hover/focus follow, and a rAF-coalesced re-sync on resize.
 * `resync` is called (already coalesced) with the current hover index; returns a disposer.
 */
export function bindTabLens(tabs: HTMLElement, resync: (hoverIndex: number) => void): () => void {
  let hoverIndex = -1;
  let frame = 0;
  const render = (): void => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      resync(hoverIndex);
    });
  };
  const unbindPress = bindLensPress(tabs);
  const unbindHover = bindLensHover(tabs, (index) => {
    hoverIndex = index;
    render();
  });
  const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(render) : null;
  resizeObserver?.observe(tabs);
  window.addEventListener("resize", render, { passive: true });
  return () => {
    cancelAnimationFrame(frame);
    unbindPress();
    unbindHover();
    resizeObserver?.disconnect();
    window.removeEventListener("resize", render);
  };
}
