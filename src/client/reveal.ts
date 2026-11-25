/**
 * Scroll reveals + word split + stats count-up.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import { prefersReducedMotion } from "../lib/browser/reducedMotion";

export {};

declare global {
  interface Window {
    __portfolioReady?: boolean;
  }
}

const reduced = prefersReducedMotion();

const COUNT_UP_DURATION_MS = 2200;
const OVERSHOOT_START = 0.9;
const OVERSHOOT_AMPLITUDE = 0.025;
const ADAPTIVE_FONT_BASE = 16;
const ADAPTIVE_BASE_WIDTH = 1920;
const ADAPTIVE_COEFFICIENT = 0.6666;
const DEFAULT_STAGGER_STEP_MS = 85;
const DEFAULT_STAGGER_BASE_MS = 50;

/** Attribute value, falling back to `fallback` when it is missing OR empty (matches the legacy `||` behaviour). */
function attributeText(element: Element, name: string, fallback: string): string {
  const value = element.getAttribute(name);
  return value === null || value === "" ? fallback : value;
}

/** Integer data attribute with a default; NaN (garbled) is kept as-is, exactly like the legacy `parseInt`. */
function intAttribute(element: Element, name: string, fallback: string): number {
  return parseInt(attributeText(element, name, fallback), 10);
}

// Count-up curve: standard easeOutCubic for the first 90% of progress, then a small overshoot in
// the last 10% — the number ticks slightly past its target and settles back, like a spring-driven
// counter, instead of stopping flat. Subtle by design (a small UI detail, not a hero animation):
// peaks ~2.5% past 1 before easing back to exactly 1 at t=1, so the final displayed value is always
// correct. Reduced-motion never calls this — initCountUp() writes the final value instantly instead.
function easeOutCubicOvershoot(progress: number): number {
  const cubicOut = (value: number): number => 1 - Math.pow(1 - value, 3);
  if (progress < OVERSHOOT_START) return cubicOut(progress / OVERSHOOT_START);
  const tail = (progress - OVERSHOOT_START) / (1 - OVERSHOOT_START); // 0..1 across the last 10%
  // sin(tail*PI) is 0 at both ends and peaks at tail=0.5, so this returns exactly 1 at t=0.9 and
  // t=1 (final value always lands exact), bumping ~2.5% past 1 in between.
  return 1 + OVERSHOOT_AMPLITUDE * Math.sin(tail * Math.PI);
}

/** Two nested animation frames: the first lets pending style writes paint, the second starts the transition. */
function afterTwoFrames(callback: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

// Shared across initReveals/initStagger and the late-mount watcher below: Alpine's x-for sections
// (services/experience/skills/stats/education) don't exist in the DOM yet when boot() first runs —
// they're created moments later once portfolioDataReady resolves and Alpine finishes its init walk.
// A single querySelectorAll pass here would permanently miss them (still carrying the CSS
// opacity:0 default, no observer ever attached) on any device slow enough that Alpine's walk
// outlasts the loader's fixed timer. boot()'s late-mount MutationObserver (below) re-runs
// these same observe-functions for anything Alpine mounts after this first pass.
let revealObserver: IntersectionObserver | null = null;

// Read-only: is `element` already inside the viewport right now? No style writes here — kept separate
// from applyRevealVisible() below so a batch of elements can all be READ before any of them WRITE
// (see initReveals()). Interleaving read(el1)/write(el1)/read(el2)/write(el2)/... across many
// elements in the same frame forces a synchronous layout recalc on every read — confirmed as the
// top `forced-reflow-insight` contributor in a live Lighthouse trace before this fix.
function isAlreadyVisible(element: Element): boolean {
  if (reduced || element.classList.contains("is-visible")) return false;
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const margin = Math.round(viewportHeight * 0.08);
  return rect.top < viewportHeight - margin && rect.bottom > margin;
}

/** Publishes the element's reveal delay (custom property + transition delay) before it becomes visible. */
function applyRevealDelay(element: HTMLElement): void {
  const delay = intAttribute(element, "data-delay", "0");
  element.style.setProperty("--reveal-delay", `${delay}ms`);
  if (delay) element.style.transitionDelay = `${delay}ms`;
}

// Write-only counterpart to isAlreadyVisible() — call only after every element in the batch has
// already been read, so no write in this pass can invalidate another element's pending read.
function applyRevealVisible(element: HTMLElement): void {
  applyRevealDelay(element);
  element.classList.add("is-visible");
  revealObserver?.unobserve(element);
}

function createRevealObserver(): IntersectionObserver {
  const observer: IntersectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
        const target = entry.target;
        applyRevealDelay(target);
        afterTwoFrames(() => {
          target.classList.add("is-visible");
        });
        observer.unobserve(target);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );
  return observer;
}

function observeReveal(element: HTMLElement): void {
  if (reduced) {
    element.classList.add("is-visible");
    return;
  }
  revealObserver ??= createRevealObserver();
  revealObserver.observe(element);
}

// Late-mount path (initLateMountWatcher, below). A single MutationObserver callback frequently
// reports MANY newly-added [data-reveal] nodes at once — Alpine's x-for loops (services,
// experience, skills, stats, education) land in the same batch when Alpine finishes its reactive
// walk. Each element used to schedule its own independent double-rAF read+write, which recreates
// the interleaved-read/write forced-reflow pattern initReveals() was already fixed for. Queue
// late-mounted elements and flush them through the same shared batched read-phase-then-write-phase
// pass instead of one-off per-element checks.
let lateMountQueue: HTMLElement[] = [];
let lateMountFrame = 0;

function revealVisibleBatch(elements: HTMLElement[]): void {
  const toReveal = elements.filter(isAlreadyVisible); // read phase — no writes yet
  toReveal.forEach(applyRevealVisible); // write phase — all reads already done
}

function flushLateMountQueue(): void {
  const elements = lateMountQueue;
  lateMountQueue = [];
  lateMountFrame = 0;
  revealVisibleBatch(elements);
}

function queueRevealCheck(element: HTMLElement): void {
  lateMountQueue.push(element);
  if (!lateMountFrame) lateMountFrame = requestAnimationFrame(() => requestAnimationFrame(flushLateMountQueue));
}

function observeAndCheckReveal(element: HTMLElement): void {
  observeReveal(element);
  queueRevealCheck(element);
}

function initReveals(): void {
  const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
  elements.forEach(observeReveal);
  if (reduced || !elements.length) return;
  // Eager visibility check only needs to run for elements that could plausibly sit inside the
  // viewport at scroll position 0 — #home/#about are the only sections that ever render above the
  // fold at initial load, no matter the viewport height. Elements below that are always off-screen
  // at boot and are handled correctly by observeReveal()'s IntersectionObserver, whose initial
  // callback is computed as part of the browser's own rendering pipeline instead of forcing a
  // synchronous layout. Narrowing this eager sweep cut its forced-reflow cost roughly in half.
  const eager = elements.filter((element) => element.closest("#home, #about"));
  afterTwoFrames(() => {
    revealVisibleBatch(eager);
  });
}

function revealStaggerRow(row: HTMLElement): void {
  const kids = row.children;
  const step = intAttribute(row, "data-stagger-step", String(DEFAULT_STAGGER_STEP_MS));
  const base = intAttribute(row, "data-stagger-base", String(DEFAULT_STAGGER_BASE_MS));
  Array.from(kids).forEach((kid, index) => {
    if (kid instanceof HTMLElement || kid instanceof SVGElement) kid.style.setProperty("--reveal-delay", `${base + index * step}ms`);
  });
  afterTwoFrames(() => {
    row.classList.add("is-visible");
  });
}

let staggerObserver: IntersectionObserver | null = null;

function createStaggerObserver(): IntersectionObserver {
  const observer: IntersectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
        revealStaggerRow(entry.target);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
  );
  return observer;
}

function observeStagger(row: HTMLElement): void {
  if (reduced) {
    row.classList.add("is-visible");
    return;
  }
  staggerObserver ??= createStaggerObserver();
  staggerObserver.observe(row);
}

function initStagger(): void {
  document.querySelectorAll<HTMLElement>("[data-stagger]").forEach(observeStagger);
}

function runCountUp(element: HTMLElement): void {
  const value = intAttribute(element, "data-value", "0");
  const suffix = attributeText(element, "data-suffix", "");
  const startTime = performance.now();
  const frame = (now: number): void => {
    const progress = Math.min((now - startTime) / COUNT_UP_DURATION_MS, 1);
    element.textContent = `${Math.round(easeOutCubicOvershoot(progress) * value)}${suffix}`;
    if (progress < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function initCountUp(): void {
  const elements = document.querySelectorAll<HTMLElement>("[data-count]");
  if (reduced) {
    elements.forEach((element) => {
      element.textContent = `${attributeText(element, "data-value", "0")}${attributeText(element, "data-suffix", "")}`;
    });
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
        runCountUp(entry.target);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.3 },
  );
  elements.forEach((element) => {
    observer.observe(element);
  });
}

function applyAdaptiveGrid(): void {
  const widthReduction = ((ADAPTIVE_BASE_WIDTH - window.innerWidth) / ADAPTIVE_BASE_WIDTH) * 100;
  const size = ADAPTIVE_FONT_BASE - (ADAPTIVE_FONT_BASE * (widthReduction * ADAPTIVE_COEFFICIENT)) / 100;
  if (size > ADAPTIVE_FONT_BASE) document.documentElement.style.fontSize = `${size}px`;
  else document.documentElement.style.removeProperty("font-size");
}

function initScrollProgress(): void {
  const bar = document.querySelector<HTMLElement>(".scroll-progress");
  if (!bar || reduced) return;
  const root = document.documentElement;
  let animationFrame = 0;
  const update = (): void => {
    animationFrame = 0;
    const max = root.scrollHeight - root.clientHeight;
    const progress = max > 0 ? Math.min(root.scrollTop / max, 1) : 0;
    bar.style.setProperty("--sp", progress.toFixed(4));
  };
  const schedule = (): void => {
    if (!animationFrame) animationFrame = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  // First reading on the next frame, not now: scrollHeight / clientHeight here would flush a pending layout mid-boot.
  schedule();
}

function observeLateMountedNode(node: Node): void {
  if (!(node instanceof Element)) return;
  if (node instanceof HTMLElement && node.matches("[data-reveal]")) observeAndCheckReveal(node);
  if (node instanceof HTMLElement && node.matches("[data-stagger]")) observeStagger(node);
  node.querySelectorAll<HTMLElement>("[data-reveal]").forEach(observeAndCheckReveal);
  node.querySelectorAll<HTMLElement>("[data-stagger]").forEach(observeStagger);
}

// Watches for [data-reveal]/[data-stagger] elements mounted after the first pass (Alpine's x-for
// sections land here on a slow device/network — see the comment above observeReveal). One shared
// observer for the whole document: DOM mutations are infrequent post-load, so this is not a
// per-frame cost, just a safety net for late arrivals.
function initLateMountWatcher(): void {
  if (reduced || !("MutationObserver" in window)) return;
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) mutation.addedNodes.forEach(observeLateMountedNode);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function boot(): void {
  initReveals();
  initStagger();
  initCountUp();
  initScrollProgress();
  initLateMountWatcher();
  applyAdaptiveGrid();
  // rAF-coalesced: writes documentElement's own font-size, which cascades a size recalc through
  // every rem-based rule in the document — a resize-drag must collapse to one write per frame,
  // not one per event.
  let gridFrame = 0;
  window.addEventListener("resize", () => {
    if (gridFrame) return;
    gridFrame = requestAnimationFrame(() => {
      gridFrame = 0;
      applyAdaptiveGrid();
    });
  });
}

window.addEventListener("portfolio-ready", boot);
if (window.__portfolioReady) boot();
