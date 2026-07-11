/**
 * Scroll reveals + word split + stats count-up.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Shared across initReveals/initStagger and the late-mount watcher below: Alpine's x-for sections
  // (services/experience/skills/stats/education) don't exist in the DOM yet when boot() first runs —
  // they're created moments later once portfolioDataReady resolves and Alpine finishes its init walk.
  // A single querySelectorAll pass here would permanently miss them (still carrying the CSS
  // opacity:0 default, no observer ever attached) on any device slow enough that Alpine's walk
  // outlasts the loader's fixed timer. boot()'s late-mount MutationObserver (below) re-runs
  // these same observe-functions for anything Alpine mounts after this first pass.
  let revealIO = null;

  function revealIfAlreadyVisible(el) {
    if (reduced || el.classList.contains("is-visible")) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const margin = Math.round(vh * 0.08);
    if (rect.top < vh - margin && rect.bottom > margin) {
      const delay = parseInt(el.getAttribute("data-delay") || "0", 10);
      el.style.setProperty("--reveal-delay", delay + "ms");
      if (delay) el.style.transitionDelay = delay + "ms";
      el.classList.add("is-visible");
      revealIO?.unobserve(el);
    }
  }

  function observeReveal(el) {
    if (reduced) {
      el.classList.add("is-visible");
      return;
    }
    if (!revealIO) {
      revealIO = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              const el2 = e.target;
              const delay = parseInt(el2.getAttribute("data-delay") || "0", 10);
              el2.style.setProperty("--reveal-delay", delay + "ms");
              if (delay) el2.style.transitionDelay = delay + "ms";
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  el2.classList.add("is-visible");
                });
              });
              revealIO.unobserve(el2);
            }
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
    }
    revealIO.observe(el);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => revealIfAlreadyVisible(el));
    });
  }

  function initReveals() {
    document.querySelectorAll("[data-reveal]").forEach(observeReveal);
  }

  function revealStaggerRow(row) {
    const kids = row.children;
    const step = parseInt(row.getAttribute("data-stagger-step") || "85", 10);
    const base = parseInt(row.getAttribute("data-stagger-base") || "50", 10);
    for (let i = 0; i < kids.length; i++) {
      kids[i].style.setProperty("--reveal-delay", base + i * step + "ms");
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        row.classList.add("is-visible");
      });
    });
  }

  let staggerIO = null;
  function observeStagger(row) {
    if (reduced) {
      row.classList.add("is-visible");
      return;
    }
    if (!staggerIO) {
      staggerIO = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            revealStaggerRow(e.target);
            staggerIO.unobserve(e.target);
          }
        },
        { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
      );
    }
    staggerIO.observe(row);
  }

  function initStagger() {
    document.querySelectorAll("[data-stagger]").forEach(observeStagger);
  }

  function initCountUp() {
    const els = document.querySelectorAll("[data-count]");
    if (reduced) {
      els.forEach((el) => {
        el.textContent = (el.getAttribute("data-value") || "0") + (el.getAttribute("data-suffix") || "");
      });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target;
          const val = parseInt(el.getAttribute("data-value") || "0", 10);
          const suf = el.getAttribute("data-suffix") || "";
          const dur = 2200;
          const st = performance.now();
          const ease = (t) => 1 - Math.pow(1 - t, 3);
          const run = (now) => {
            const t = Math.min((now - st) / dur, 1);
            el.textContent = Math.round(ease(t) * val) + suf;
            if (t < 1) requestAnimationFrame(run);
          };
          requestAnimationFrame(run);
          io.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    els.forEach((el) => io.observe(el));
  }

  function applyAdaptiveGrid() {
    const FONT_BASE = 16;
    const baseWidth = 1920;
    const coef = 0.6666;
    const w = window.innerWidth;
    const widthReduction = ((baseWidth - w) / baseWidth) * 100;
    const size = FONT_BASE - (FONT_BASE * (widthReduction * coef)) / 100;
    if (size > FONT_BASE) document.documentElement.style.fontSize = size + "px";
    else document.documentElement.style.removeProperty("font-size");
  }

  function initScrollProgress() {
    const bar = document.querySelector(".scroll-progress");
    if (!bar || reduced) return;
    const h = document.documentElement;
    let raf = 0;
    function update() {
      raf = 0;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? Math.min(h.scrollTop / max, 1) : 0;
      bar.style.setProperty("--sp", p.toFixed(4));
    }
    const schedule = function () { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    update();
  }

  // Watches for [data-reveal]/[data-stagger] elements mounted after the first pass (Alpine's x-for
  // sections land here on a slow device/network — see the comment above observeReveal). One shared
  // observer for the whole document: DOM mutations are infrequent post-load, so this is not a
  // per-frame cost, just a safety net for late arrivals.
  function initLateMountWatcher() {
    if (reduced || !("MutationObserver" in window)) return;
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches("[data-reveal]")) observeReveal(node);
          if (node.matches("[data-stagger]")) observeStagger(node);
          node.querySelectorAll?.("[data-reveal]").forEach(observeReveal);
          node.querySelectorAll?.("[data-stagger]").forEach(observeStagger);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    initReveals();
    initStagger();
    initCountUp();
    initScrollProgress();
    initLateMountWatcher();
    applyAdaptiveGrid();
    // rAF-coalesced: writes documentElement's own font-size, which cascades a size recalc through
    // every rem-based rule in the document — a resize-drag must collapse to one write per frame,
    // not one per event.
    let gridRaf = 0;
    window.addEventListener("resize", function () {
      if (!gridRaf) gridRaf = requestAnimationFrame(() => { gridRaf = 0; applyAdaptiveGrid(); });
    });
  }

  window.addEventListener("portfolio-ready", boot);
  if (window.__portfolioReady) boot();
})();
