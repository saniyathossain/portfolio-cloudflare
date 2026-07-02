/** Intro loader — skeleton shimmer, GPU progress, slide-up exit */
(function () {
  const FILL_MS = 1300;
  const REVEAL_AT = 0.28;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ready = false;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
    if (loader) {
      loader.classList.add("is-fade-center");
      loader.classList.add("is-exit");
      setTimeout(() => {
        startScroll();
        loader.remove();
      }, reduced ? 0 : 720);
    } else {
      startScroll();
    }
    setReady();
    try {
      sessionStorage.setItem("portfolio-visited", "1");
    } catch (_) {}
  }

  function skipLoader() {
    const loader = document.getElementById("loader");
    if (loader) loader.remove();
    startScroll();
    setReady();
  }

  function runLoader() {
    if (reduced) {
      skipLoader();
      return;
    }
    try {
      if (sessionStorage.getItem("portfolio-visited")) {
        skipLoader();
        return;
      }
    } catch (_) {}

    const loader = document.getElementById("loader");
    const fill = document.getElementById("loadFill");
    const num = document.getElementById("loadNum");
    if (!loader) {
      setReady();
      startScroll();
      return;
    }

    stopScroll();
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

  window.portfolioLoader = { isReady: () => ready, stopScroll, startScroll };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runLoader);
  } else {
    runLoader();
  }
})();
