/**
 * Boot loader — registers the service worker and loads the page scripts in dependency order. No framework runtime
 * and no data fetch any more: content is server-rendered and the interactive parts are Preact islands (docs/aidlc/61).
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import { prefersReducedMotion } from "../lib/browser/reducedMotion";

const ASSET_V = "fd421623ed59"; // stamped by scripts/set-asset-version.js on every ./build.sh — do not hand-edit
const SERVICE_WORKER_URL = "/sw.js";
const IDLE_TIMEOUT_MS = 3000;
const IDLE_FALLBACK_DELAY_MS = 800;
const reduced = prefersReducedMotion();
const finePointer = window.matchMedia("(pointer: fine)").matches;

/** Needed as soon as the page is interactive: the delegated click handlers and the page effects. */
const EARLY_SCRIPTS = ["/assets/js/actions.min.js", "/assets/js/shell-effects.min.js"] as const;
/** Scroll-reveal helpers, loaded right after. */
const DEFERRED_SCRIPTS = ["/assets/js/reveal.min.js", "/assets/js/blur-reveal.min.js"] as const;

// Tap-reveal brand pills on touch / no-hover (static force-open remains the reduced/no-JS fallback).
if (!reduced && (window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(hover: none)").matches)) {
  document.documentElement.classList.add("touch-pills");
}

function versioned(source: string): string {
  return source.includes("?") ? source : `${source}?v=${ASSET_V}`;
}

function loadScript(source: string): Promise<void> {
  const url = versioned(source);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = false;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      reject(new Error(`Failed to load ${url}`));
    };
    document.body.appendChild(script);
  });
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(SERVICE_WORKER_URL).catch(() => undefined);
}

/**
 * motion hand-rolls its own rAF-lerp spring for magnetic CTAs + hero tilt (no external library) — desktop /
 * fine-pointer only, so it no-ops and costs nothing on touch devices.
 */
async function loadIdleScripts(): Promise<void> {
  const idleScripts = ["/assets/js/motion.min.js"];
  if (finePointer && !reduced) idleScripts.push("/assets/js/liquid-hero.min.js", "/assets/js/aurora.min.js");
  await Promise.all(idleScripts.map(loadScript));
}

function scheduleIdle(): void {
  const run = () => {
    loadIdleScripts().catch(() => undefined);
  };
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
  else setTimeout(run, IDLE_FALLBACK_DELAY_MS);
}

async function boot(): Promise<void> {
  registerServiceWorker();
  await Promise.all(EARLY_SCRIPTS.map(loadScript));
  await Promise.all(DEFERRED_SCRIPTS.map(loadScript));
  scheduleIdle();
}

// A brand logo that fails to load (blocked by an extension, flaky network) must never show the browser's
// broken-image glyph: swap it for the pill's monogram, the same fallback unknown brands use. Capture phase, because
// `error` does not bubble; delegated, so pills mounted later (accordion bodies) are covered too.
document.addEventListener(
  "error",
  (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const badge = image.closest(".brand-pill__badge");
    if (!badge) return;
    const monogram = document.createElement("span");
    monogram.className = "brand-pill__mono";
    monogram.textContent = (image.alt || "?").trim().charAt(0).toUpperCase() || "?";
    badge.replaceChild(monogram, image);
  },
  true,
);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void boot();
  });
} else {
  void boot();
}

export {};
