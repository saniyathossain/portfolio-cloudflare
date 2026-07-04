/** Load Alpine + deferred motion/reveal scripts; register service worker */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const ASSET_V = "ce15fa9ec249"; // stamped by scripts/set-asset-version.js on every ./build.sh — do not hand-edit
  function loadScript(src) {
    const url = src.indexOf("?") === -1 ? src + "?v=" + ASSET_V : src;
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load " + url));
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
    // Motion One drives magnetic CTAs + hero tilt — desktop/fine-pointer only. Gating it here keeps
    // its 22 KB (gz) off touch devices, where motion.js no-ops (→ zero unused bytes on mobile).
    // Ordered before motion.js so window.Motion is defined when motion.js runs (loadScript is async=false).
    const idleScripts = [];
    if (finePointer && !reduced) idleScripts.push("/assets/js/vendor/motion.min.js");
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
    // portfolio.json is same-origin but still a real network request — a transient failure here
    // (offline load, CDN hiccup) must not cascade into skipping Alpine/app.js entirely, since that
    // would leave the whole site inert with unevaluated x-data markup. app.js's `window.PORTFOLIO_DATA
    // || {}` fallback already tolerates a missing data set, so swallow the rejection and continue —
    // the page degrades to empty data-driven sections instead of a totally dead interactive layer.
    await window.portfolioDataReady.catch((err) => console.error("portfolio.json failed to load:", err));
    await loadScript("/assets/js/app.min.js");
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
