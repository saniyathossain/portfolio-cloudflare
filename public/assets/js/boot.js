/**
 * Boot loader — loads Alpine + deferred motion/reveal scripts, registers the service worker.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  // Tap-reveal brand pills on touch / no-hover (static force-open remains the reduced/no-JS fallback).
  if (!reduced && (window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(hover: none)").matches)) {
    document.documentElement.classList.add("touch-pills");
  }

  const ASSET_V = "9898cfda5008"; // stamped by scripts/set-asset-version.js on every ./build.sh — do not hand-edit
  function loadScript(src) {
    const url = src.indexOf("?") === -1 ? `${src}?v=${ASSET_V}` : src;
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${url}`));
      document.body.appendChild(s);
    });
  }

  function registerSw() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  function loadDeferredScripts() {
    const readyScripts = [
      "/assets/js/reveal.min.js",
      "/assets/js/blur-reveal.min.js",
    ];
    return Promise.all(readyScripts.map(loadScript));
  }

  function loadIdleScripts() {
    // motion.js hand-rolls its own rAF-lerp spring for magnetic CTAs + hero tilt (no external
    // library) — desktop/fine-pointer only, so it no-ops and costs nothing on touch devices.
    const idleScripts = [];
    idleScripts.push("/assets/js/motion.min.js");
    if (finePointer && !reduced) {
      idleScripts.push("/assets/js/liquid-hero.min.js");
      idleScripts.push("/assets/js/aurora.min.js");
    }
    return Promise.all(idleScripts.map(loadScript));
  }

  function scheduleIdle() {
    const run = () => loadIdleScripts().catch(() => {});
    if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 3000 });
    else setTimeout(run, 800);
  }


  async function boot() {
    registerSw();

    // app.js reads window.PORTFOLIO_DATA synchronously at module-parse time (`const D =
    // window.PORTFOLIO_DATA || {}`), so its EXECUTION must genuinely wait for the data fetch — that
    // ordering can't change. But the DOWNLOAD of app.min.js/alpine.min.js has zero dependency on the
    // data fetch; warm the HTTP cache for both now, in parallel with the data round-trip, so that by
    // the time the serial load below runs, script insertion is a cache hit instead of a fresh
    // network request stacked serially after the json fetch. Fire-and-forget: any failure here just
    // means the later loadScript() falls back to a normal (uncached) fetch.
    fetch(`/assets/js/icons.min.js?v=${ASSET_V}`).catch(() => {});
    fetch(`/assets/js/app.min.js?v=${ASSET_V}`).catch(() => {});
    fetch(`/assets/js/skills-flat.min.js?v=${ASSET_V}`).catch(() => {});
    fetch(`/assets/js/editorial.min.js?v=${ASSET_V}`).catch(() => {});
    fetch(`/assets/js/vendor/alpine.min.js?v=${ASSET_V}`).catch(() => {});

    // portfolio.json is same-origin but still a real network request — a transient failure here
    // (offline load, CDN hiccup) must not cascade into skipping Alpine/app.js entirely, since that
    // would leave the whole site inert with unevaluated x-data markup. app.js's `window.PORTFOLIO_DATA
    // || {}` fallback already tolerates a missing data set, so swallow the rejection and continue —
    // the page degrades to empty data-driven sections instead of a totally dead interactive layer.
    await window.portfolioDataReady.catch((err) => console.error("portfolio.json failed to load:", err));
    await loadScript("/assets/js/app.min.js");
    await loadScript("/assets/js/skills-flat.min.js");
    await loadScript("/assets/js/editorial.min.js");
    await loadScript("/assets/js/vendor/alpine.min.js");
    await loadDeferredScripts();
    scheduleIdle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
