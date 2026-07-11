/**
 * Intro loader — skeleton shimmer, GPU progress, progressive site blur, slide-up exit.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
(function () {
  const FILL_MS = 650;
  const REVEAL_AT = 0.12;
  const DIM_MAX = 0.48;
  const SCALE_MAX = 0.012;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ready = false;
  let running = false;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function rootEl() {
    return document.documentElement;
  }

  // Only ever called twice (load start p=0, load end p=1) — the blur/dim/scale glide between those
  // two states is a CSS transition (styles.css `html.is-loading .app-root`/`.load-scrim`, driven by
  // --load-ms below), not a per-rAF-frame JS write. Writing these custom properties every frame used
  // to force a style recalc that cascades expensive on a large DOM (measured as real main-thread
  // blocking time); two writes + a CSS transition produce the same progressive-unblur look for a
  // fraction of the cost.
  function setLoadVisuals(p) {
    const root = rootEl();
    const dim = (1 - p) * DIM_MAX;
    const scale = 1 + (1 - p) * SCALE_MAX;
    root.style.setProperty("--load-dim", dim.toFixed(3));
    root.style.setProperty("--load-scale", scale.toFixed(4));
  }

  function ensureScrim() {
    let scrim = document.getElementById("load-scrim");
    if (!scrim) {
      scrim = document.createElement("div");
      scrim.id = "load-scrim";
      scrim.className = "load-scrim";
      scrim.setAttribute("aria-hidden", "true");
      document.body.insertBefore(scrim, document.body.firstChild);
    }
    return scrim;
  }

  function resetPageState() {
    const root = rootEl();
    root.classList.remove("is-ready");
    document.querySelector(".hero")?.classList.remove("is-ready");
    document.querySelector(".site-header")?.classList.remove("is-ready");
    ready = false;
    window.__portfolioReady = false;
  }

  function beginLoading() {
    resetPageState();
    const root = rootEl();
    root.classList.add("is-loading");
    root.style.setProperty("--load-ms", FILL_MS + "ms");
    setLoadVisuals(0);
    ensureScrim();
  }

  function endLoading() {
    const root = rootEl();
    root.classList.remove("is-loading");
    root.style.removeProperty("--load-blur");
    root.style.removeProperty("--load-dim");
    root.style.removeProperty("--load-scale");
    root.style.removeProperty("--load-ms");
  }

  function stopScroll() {
    document.documentElement.classList.add("scroll-lock");
    document.body.classList.add("scroll-lock");
  }

  function startScroll() {
    document.documentElement.classList.remove("scroll-lock");
    document.body.classList.remove("scroll-lock");
  }

  function setReady() {
    ready = true;
    window.__portfolioReady = true;
    document.documentElement.classList.add("is-ready");
    document.querySelector(".hero")?.classList.add("is-ready");
    document.querySelector(".site-header")?.classList.add("is-ready");
    window.dispatchEvent(new Event("portfolio-ready"));
  }

  function finishLoader(loader) {
    // Blur/dim/scale are already at p=1 (kicked off in runLoader(), transitioning in parallel with
    // the fill loop) by the time this fires — no extra write needed.
    const complete = () => {
      endLoading();
      startScroll();
      running = false;
      setReady();
    };
    if (loader) {
      loader.classList.add("is-fade-center");
      loader.classList.add("is-exit");
      setTimeout(() => {
        loader.remove();
        complete();
      }, reduced ? 0 : 400);
    } else {
      complete();
    }
    try {
      sessionStorage.setItem("portfolio-visited", "1");
    } catch (_) {}
  }

  function skipLoader() {
    const loader = document.getElementById("loader");
    if (loader) loader.remove();
    endLoading();
    startScroll();
    setReady();
    running = false;
  }

  function runLoader() {
    if (running) return;

    const loader = document.getElementById("loader");
    const fill = document.getElementById("loadFill");
    const num = document.getElementById("loadNum");
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
      if (num) num.textContent = "100";
      setLoadVisuals(1); // one-off, not per-frame — fine under reduced-motion
      finishLoader(loader);
      return;
    }

    stopScroll();
    // Kick the blur/dim/scale CSS transition off now, running for --load-ms (== FILL_MS) in parallel
    // with the fill-bar/count-up rAF loop below — not sequentially after it. A separate rAF tick
    // guarantees the p=0 values set in beginLoading() actually commit a frame before this p=1 write,
    // so the browser has something to transition *from* instead of skipping straight to the end state.
    requestAnimationFrame(() => setLoadVisuals(1));
    const start = performance.now();
    let revealed = false;

    function step(now) {
      const t = Math.min((now - start) / FILL_MS, 1);
      const p = easeInOutCubic(t);
      const count = Math.round(p * 100);
      if (fill) fill.style.transform = "scaleX(" + p + ")";
      if (num) num.textContent = String(count).padStart(3, "0");
      if (!revealed && t >= REVEAL_AT) {
        revealed = true;
        loader.classList.add("is-revealed");
      }
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        finishLoader(loader);
      }
    }
    requestAnimationFrame(step);
  }

  window.portfolioLoader = { isReady: () => ready, stopScroll, startScroll, skipLoader };

  function scheduleLoader() {
    beginLoading();
    requestAnimationFrame(() => requestAnimationFrame(runLoader));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleLoader);
  } else {
    scheduleLoader();
  }

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    running = false;
    scheduleLoader();
  });
})();
