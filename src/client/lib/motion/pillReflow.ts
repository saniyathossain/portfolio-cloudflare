/**
 * When pill rows wrap (label reveal), glide their container height so everything below slides instead of jumping —
 * next-element-agnostic via document flow (Editorial, Stats, or any future section). Experience: .exp-details; Skills
 * flat: .skills-flat; Skills cards: .glass-panel.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
const FALLBACK_REFLOW_MS = 440;
const FALLBACK_EASE = "cubic-bezier(0.23, 0.84, 0.35, 1)";

type ReflowKind = "exp" | "skills-flat" | "skills-card";

interface ReflowTarget {
  panel: HTMLElement;
  inner: HTMLElement;
  kind: ReflowKind;
}

/** Per-panel animation bookkeeping. */
interface PanelState {
  frame: number;
  timer: number;
  onEnd: ((event: TransitionEvent) => void) | null;
  layer: StyledElement | null;
}

type StyledElement = Element & ElementCSSInlineStyle;

/** Accordion panels carry a `_heightTimer` expando set by the toggle code (app.js / editorial.js) while it animates. */
interface HeightTimedPanel extends HTMLElement {
  _heightTimer?: number;
}

/** What pillFlip()/pillTap() drive: the height-glide controller for whichever panel contains a pill row. */
export interface ReflowPanelController {
  lock(row: HTMLElement): ReflowTarget | null;
  reflow(row: HTMLElement | null, durationMs?: number, precomputedTo?: number | null): void;
  pin(panel: HTMLElement): void;
  measureTarget(row: HTMLElement): number | null;
}

const panelStates = new WeakMap<HTMLElement, PanelState>();
const panelLockUntil = new WeakMap<HTMLElement, number>();
const rowLockUntil = new WeakMap<HTMLElement, number>();
const observedRows = new WeakSet<Element>();

function hasPendingHeightTimer(panel: HTMLElement): boolean {
  return Boolean((panel as HeightTimedPanel)._heightTimer);
}

function isLocked(lockUntil: number | undefined): boolean {
  return (lockUntil ?? 0) > performance.now();
}

function rootStyle(): CSSStyleDeclaration {
  return getComputedStyle(document.documentElement);
}

function readReflowMs(fallback: number): number {
  const seconds = parseFloat(rootStyle().getPropertyValue("--dur-pill-panel-reflow"));
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : fallback;
}

function readEase(): string {
  return rootStyle().getPropertyValue("--ease-pill-flip").trim() || FALLBACK_EASE;
}

function resolveExperienceTarget(panel: HTMLElement): ReflowTarget | null {
  if (!panel.classList.contains("is-open")) return null;
  const inner = panel.querySelector<HTMLElement>(".exp-details__inner");
  if (!inner) return null;
  return { panel, inner, kind: "exp" };
}

function resolveReflowTarget(row: HTMLElement | null): ReflowTarget | null {
  if (!row) return null;

  const expPanel = row.closest<HTMLElement>(".exp-details");
  if (expPanel) return resolveExperienceTarget(expPanel);

  const skillsPanel = row.closest<HTMLElement>(".skills-flat__panel");
  if (skillsPanel) {
    const inner = skillsPanel.querySelector<HTMLElement>(".skills-flat__inner") ?? skillsPanel;
    return { panel: skillsPanel, inner, kind: "skills-flat" };
  }

  const skillsFlat = row.closest<HTMLElement>(".skills-flat");
  if (skillsFlat) {
    const inner = skillsFlat.querySelector<HTMLElement>(".skills-flat__inner") ?? skillsFlat;
    const panel = skillsFlat.querySelector<HTMLElement>(".skills-flat__panel") ?? skillsFlat;
    return { panel, inner, kind: "skills-flat" };
  }

  const skillCard = row.closest<HTMLElement>("#skills .glass-panel");
  if (skillCard) return { panel: skillCard, inner: skillCard, kind: "skills-card" };

  return null;
}

/** Reading offsetHeight flushes pending style/layout so the next inline write starts a fresh transition. */
function forceLayout(element: HTMLElement): number {
  return element.offsetHeight;
}

function hasInlineStyle(element: Element): element is StyledElement {
  return "style" in element;
}

function compositorLayer(target: HTMLElement): StyledElement {
  const candidate = target.firstElementChild ?? target;
  const layer = hasInlineStyle(candidate) ? candidate : target;
  layer.style.willChange = "transform";
  layer.style.transform = "translateZ(0)";
  return layer;
}

function releaseCompositorLayer(layer: StyledElement | null): void {
  if (!layer) return;
  layer.style.willChange = "";
  layer.style.transform = "";
}

function pinnedInnerFor(panel: HTMLElement): HTMLElement | null {
  if (panel.classList.contains("exp-details")) {
    if (!panel.classList.contains("is-open")) return null;
    return panel.querySelector<HTMLElement>(".exp-details__inner");
  }
  if (panel.classList.contains("skills-flat__panel")) return panel.querySelector<HTMLElement>(".skills-flat__inner");
  return null;
}

function pinPanelHeight(panel: HTMLElement): void {
  if (hasPendingHeightTimer(panel)) return;
  const inner = pinnedInnerFor(panel);
  if (!inner) return;
  const height = inner.scrollHeight;
  if (height < 2) return;
  panel.style.overflow = "hidden";
  panel.style.height = `${height}px`;
}

function readTargetHeight(panel: HTMLElement, inner: HTMLElement): number {
  const previousHeight = panel.style.height;
  const previousOverflow = panel.style.overflow;
  const previousTransition = panel.style.transition;
  panel.style.transition = "none";
  panel.style.height = "auto";
  panel.style.overflow = "visible";
  const height = inner.scrollHeight;
  panel.style.height = previousHeight;
  panel.style.overflow = previousOverflow || "hidden";
  forceLayout(panel);
  panel.style.transition = previousTransition;
  return height;
}

function settlePanelHeight(panel: HTMLElement, toHeight: number): void {
  panel.style.height = `${toHeight}px`;
  panel.style.overflow = "hidden";
  requestAnimationFrame(() => {
    panel.style.transition = "";
  });
}

function lockPanel(row: HTMLElement): ReflowTarget | null {
  const target = resolveReflowTarget(row);
  if (!target || hasPendingHeightTimer(target.panel)) return null;
  target.panel.style.overflow = "hidden";
  target.panel.style.height = `${target.panel.offsetHeight}px`;
  return target;
}

function startHeightTransition(target: ReflowTarget, state: PanelState, toHeight: number, durationMs: number): void {
  const { panel, inner } = target;
  clearTimeout(state.timer);
  if (state.onEnd) panel.removeEventListener("transitionend", state.onEnd);
  releaseCompositorLayer(state.layer);

  forceLayout(panel);

  state.layer = compositorLayer(inner);

  const finish = (): void => {
    clearTimeout(state.timer);
    if (state.onEnd) panel.removeEventListener("transitionend", state.onEnd);
    state.onEnd = null;
    releaseCompositorLayer(state.layer);
    state.layer = null;
    settlePanelHeight(panel, toHeight);
  };

  state.onEnd = (event) => {
    if (event.propertyName === "height") finish();
  };
  panel.addEventListener("transitionend", state.onEnd);
  state.timer = window.setTimeout(finish, durationMs + 80);

  panel.style.transition = `height ${durationMs}ms ${readEase()}`;
  panel.style.height = `${toHeight}px`;
}

function runReflowFrame(
  target: ReflowTarget,
  state: PanelState,
  durationMs: number,
  precomputedTo: number | null | undefined,
): void {
  const { panel, inner } = target;
  state.frame = 0;
  if (!panel.style.height || panel.style.height === "auto") {
    panel.style.overflow = "hidden";
    panel.style.height = `${panel.offsetHeight}px`;
  }
  const fromHeight = panel.offsetHeight;
  const toHeight = typeof precomputedTo === "number" ? precomputedTo : readTargetHeight(panel, inner);

  if (Math.abs(fromHeight - toHeight) < 2) {
    settlePanelHeight(panel, toHeight);
    return;
  }
  startHeightTransition(target, state, toHeight, durationMs);
}

function stateFor(panel: HTMLElement): PanelState {
  const existing = panelStates.get(panel);
  if (existing) return existing;
  const created: PanelState = { frame: 0, timer: 0, onEnd: null, layer: null };
  panelStates.set(panel, created);
  return created;
}

function animateReflow(target: ReflowTarget, durationOverride: number | undefined, precomputedTo: number | null | undefined): void {
  const { panel } = target;
  if (target.kind === "exp" && (!panel.classList.contains("is-open") || hasPendingHeightTimer(panel))) return;

  const state = stateFor(panel);
  if (state.frame) cancelAnimationFrame(state.frame);

  const durationMs = durationOverride === undefined || durationOverride === 0 ? readReflowMs(FALLBACK_REFLOW_MS) : durationOverride;
  panelLockUntil.set(panel, performance.now() + durationMs + 140);

  state.frame = requestAnimationFrame(() => {
    runReflowFrame(target, state, durationMs, precomputedTo);
  });
}

function measureTarget(row: HTMLElement): number | null {
  const target = resolveReflowTarget(row);
  if (!target) return null;
  return readTargetHeight(target.panel, target.inner);
}

function reflowFromRow(row: HTMLElement | null, durationMs?: number, precomputedTo?: number | null): void {
  if (!row) return;
  const driven = typeof precomputedTo === "number";
  if (!driven) {
    if (isLocked(rowLockUntil.get(row))) return;
    const peek = resolveReflowTarget(row);
    if (peek && isLocked(panelLockUntil.get(peek.panel))) return;
  }
  const target = resolveReflowTarget(row);
  if (!target) return;
  animateReflow(target, durationMs, precomputedTo);
  if (driven && durationMs) rowLockUntil.set(row, performance.now() + durationMs + 150);
}

/** Touch-only fallback — desktop uses flipRow reflow (avoid double height animations). */
function observeTouchPillRows(): void {
  if (!("ResizeObserver" in window) || !document.documentElement.classList.contains("touch-pills")) return;
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target instanceof HTMLElement) reflowFromRow(entry.target);
    }
  });
  const bindRows = (): void => {
    document.querySelectorAll(".pill-row").forEach((row) => {
      if (observedRows.has(row)) return;
      observedRows.add(row);
      resizeObserver.observe(row);
    });
  };
  const main = document.getElementById("main") ?? document.body;
  new MutationObserver(bindRows).observe(main, { childList: true, subtree: true });
  bindRows();
}

function handleHeightTransitionEnd(panel: HTMLElement): void {
  if (panel.classList.contains("exp-details")) {
    if (panel.classList.contains("is-open")) {
      // Bubble phase (not capture): runs after toggleRole()'s finish() clears inline height, so pill-row reflow always
      // has a pinned px baseline inside open accordions.
      requestAnimationFrame(() => {
        pinPanelHeight(panel);
      });
    } else {
      panel.style.height = "";
      panel.style.overflow = "";
    }
    return;
  }
  if (panel.classList.contains("skills-flat__panel")) {
    requestAnimationFrame(() => {
      pinPanelHeight(panel);
    });
  }
}

function watchExperiencePanelClass(panel: HTMLElement): void {
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName !== "class") continue;
      if (panel.classList.contains("is-open")) {
        requestAnimationFrame(() => {
          pinPanelHeight(panel);
        });
      } else {
        panel.style.height = "";
        panel.style.overflow = "";
      }
    }
  }).observe(panel, { attributes: true, attributeFilter: ["class"] });
}

export function setupPillRowReflow(): ReflowPanelController {
  observeTouchPillRows();

  document.addEventListener(
    "transitionend",
    (event) => {
      if (event.propertyName !== "height") return;
      if (event.target instanceof HTMLElement) handleHeightTransitionEnd(event.target);
    },
    false,
  );

  document.querySelectorAll<HTMLElement>(".exp-details").forEach(watchExperiencePanelClass);

  return { lock: lockPanel, reflow: reflowFromRow, pin: pinPanelHeight, measureTarget };
}
