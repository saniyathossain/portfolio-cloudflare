/** Load Alpine + deferred motion/reveal scripts; register service worker */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.body.appendChild(s);
    });
  }

  function registerSw() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  function loadDeferredScripts() {
    const readyScripts = [
      "/assets/js/vendor/motion.min.js",
      "/assets/js/reveal.js",
      "/assets/js/blur-reveal.js",
    ];
    return Promise.all(readyScripts.map(loadScript));
  }

  function loadIdleScripts() {
    const idleScripts = ["/assets/js/motion.js"];
    if (finePointer && !reduced) idleScripts.push("/assets/js/liquid-hero.js");
    return Promise.all(idleScripts.map(loadScript));
  }

  function scheduleIdle() {
    const run = () => loadIdleScripts().catch(() => {});
    if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 3000 });
    else setTimeout(run, 800);
  }

  async function boot() {
    registerSw();
    await window.portfolioDataReady;
    await loadScript("/assets/js/app.js?v=loader-fix-2");
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
