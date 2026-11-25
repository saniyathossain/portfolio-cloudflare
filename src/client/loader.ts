/**
 * Intro loader — skeleton shimmer, GPU progress, progressive site blur, slide-up exit.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import { prefersReducedMotion } from "../lib/browser/reducedMotion";

export {};

interface PortfolioLoaderApi {
  isReady: () => boolean;
  stopScroll: () => void;
  startScroll: () => void;
  skipLoader: () => void;
}

declare global {
  interface Window {
    __portfolioReady?: boolean;
    portfolioLoader?: PortfolioLoaderApi;
  }
}

const FILL_MS = 650;
const REVEAL_AT = 0.12;
const DIM_MAX = 0.48;
const EXIT_MS = 400;
// 0.003, not 0.012: Chrome's CLS metric measures the .app-root's rendered rect on every frame,
// including this intentional transform:scale() reveal — it can't tell "designed transition" from
// "unexpected shift". Confirmed via a live Lighthouse CLS spike (~0.15) traced to exactly this
// transform via a throttled-CPU repro (matched .hero__grid's measured width, e.g. 1335.84px at
// 1.012 scale vs the true 1320px layout width, to 4 decimal places). Cutting the scale delta ~4x
// cuts the CLS contribution proportionally while keeping the reveal effect intact, just subtler.
const SCALE_MAX = 0.003;
const reduced = prefersReducedMotion();
let ready = false;
let running = false;

function easeInOutCubic(progress: number): number {
  return progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

// Only ever called twice (load start p=0, load end p=1) — the blur/dim/scale glide between those
// two states is a CSS transition (styles.css `html.is-loading .app-root`/`.load-scrim`, driven by
// --load-ms below), not a per-rAF-frame JS write. Writing these custom properties every frame used
// to force a style recalc that cascades expensive on a large DOM (measured as real main-thread
// blocking time); two writes + a CSS transition produce the same progressive-unblur look for a
// fraction of the cost.
function setLoadVisuals(progress: number): void {
  const dim = (1 - progress) * DIM_MAX;
  const scale = 1 + (1 - progress) * SCALE_MAX;
  document.documentElement.style.setProperty("--load-dim", dim.toFixed(3));
  document.documentElement.style.setProperty("--load-scale", scale.toFixed(4));
}

function ensureScrim(): void {
  if (document.getElementById("load-scrim")) return;
  const scrim = document.createElement("div");
  scrim.id = "load-scrim";
  scrim.className = "load-scrim";
  scrim.setAttribute("aria-hidden", "true");
  document.body.insertBefore(scrim, document.body.firstChild);
}

function resetPageState(): void {
  document.documentElement.classList.remove("is-ready");
  document.querySelector(".hero")?.classList.remove("is-ready");
  document.querySelector(".site-header")?.classList.remove("is-ready");
  ready = false;
  window.__portfolioReady = false;
}

function beginLoading(): void {
  resetPageState();
  const root = document.documentElement;
  root.classList.add("is-loading");
  root.style.setProperty("--load-ms", `${FILL_MS}ms`);
  setLoadVisuals(0);
  ensureScrim();
}

function endLoading(): void {
  const root = document.documentElement;
  root.classList.remove("is-loading");
  root.style.removeProperty("--load-blur");
  root.style.removeProperty("--load-dim");
  root.style.removeProperty("--load-scale");
  root.style.removeProperty("--load-ms");
}

function stopScroll(): void {
  document.documentElement.classList.add("scroll-lock");
  document.body.classList.add("scroll-lock");
}

function startScroll(): void {
  document.documentElement.classList.remove("scroll-lock");
  document.body.classList.remove("scroll-lock");
}

function setReady(): void {
  ready = true;
  window.__portfolioReady = true;
  document.documentElement.classList.add("is-ready");
  document.querySelector(".hero")?.classList.add("is-ready");
  document.querySelector(".site-header")?.classList.add("is-ready");
  window.dispatchEvent(new Event("portfolio-ready"));
}

function finishLoader(loader: HTMLElement | null): void {
  // Blur/dim/scale are already at p=1 (kicked off in runLoader(), transitioning in parallel with
  // the fill loop) by the time this fires — no extra write needed.
  const complete = (): void => {
    endLoading();
    startScroll();
    running = false;
    setReady();
  };
  if (loader) {
    loader.classList.add("is-fade-center");
    loader.classList.add("is-exit");
    setTimeout(
      () => {
        loader.remove();
        complete();
      },
      reduced ? 0 : EXIT_MS,
    );
  } else {
    complete();
  }
  try {
    sessionStorage.setItem("portfolio-visited", "1");
  } catch {
    // Storage can be unavailable (private mode / blocked) — the visited flag is only an optimisation.
  }
}

function skipLoader(): void {
  document.getElementById("loader")?.remove();
  endLoading();
  startScroll();
  setReady();
  running = false;
}

function runLoader(): void {
  if (running) return;

  const loader = document.getElementById("loader");
  const fill = document.getElementById("loadFill");
  const counter = document.getElementById("loadNum");
  beginLoading();
  if (!loader) {
    endLoading();
    setReady();
    startScroll();
    return;
  }

  running = true;

  if (reduced) {
    if (fill) fill.style.transform = "scaleX(1)";
    if (counter) counter.textContent = "100";
    setLoadVisuals(1); // one-off, not per-frame — fine under reduced-motion
    finishLoader(loader);
    return;
  }

  stopScroll();
  // Kick the blur/dim/scale CSS transition off now, running for --load-ms (== FILL_MS) in parallel
  // with the fill-bar/count-up rAF loop below — not sequentially after it. A separate rAF tick
  // guarantees the p=0 values set in beginLoading() actually commit a frame before this p=1 write,
  // so the browser has something to transition *from* instead of skipping straight to the end state.
  requestAnimationFrame(() => {
    setLoadVisuals(1);
  });
  const start = performance.now();
  let revealed = false;

  const step = (now: number): void => {
    const elapsed = Math.min((now - start) / FILL_MS, 1);
    const progress = easeInOutCubic(elapsed);
    const count = Math.round(progress * 100);
    if (fill) fill.style.transform = `scaleX(${progress})`;
    if (counter) counter.textContent = String(count).padStart(3, "0");
    if (!revealed && elapsed >= REVEAL_AT) {
      revealed = true;
      loader.classList.add("is-revealed");
    }
    if (elapsed < 1) requestAnimationFrame(step);
    else finishLoader(loader);
  };
  requestAnimationFrame(step);
}

window.portfolioLoader = { isReady: () => ready, stopScroll, startScroll, skipLoader };

function scheduleLoader(): void {
  beginLoading();
  requestAnimationFrame(() => {
    requestAnimationFrame(runLoader);
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleLoader);
else scheduleLoader();

window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  running = false;
  scheduleLoader();
});
