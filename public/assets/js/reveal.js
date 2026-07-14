/**
 * Scroll reveals + word split + stats count-up.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Count-up curve: standard easeOutCubic for the first 90% of progress, then a small overshoot in
  // the last 10% — the number ticks slightly past its target and settles back, like a spring-driven
  // counter, instead of stopping flat. Subtle by design (a small UI detail, not a hero animation):
  // peaks ~2.5% past 1 before easing back to exactly 1 at t=1, so the final displayed value is always
  // correct. Reduced-motion never calls this — initCountUp() writes the final value instantly instead.
  function easeOutCubicOvershoot(t) {
    const cubicOut = (x) => 1 - Math.pow(1 - x, 3);
    if (t < 0.9) return cubicOut(t / 0.9);
    const tail = (t - 0.9) / 0.1; // 0..1 across the last 10%
    // sin(tail*PI) is 0 at both ends and peaks at tail=0.5, so this returns exactly 1 at t=0.9 and
    // t=1 (final value always lands exact), bumping ~2.5% past 1 in between.
    return 1 + 0.025 * Math.sin(tail * Math.PI);
  }

  // Shared across initReveals/initStagger and the late-mount watcher below: Alpine's x-for sections
  // (services/experience/skills/stats/education) don't exist in the DOM yet when boot() first runs —
  // they're created moments later once portfolioDataReady resolves and Alpine finishes its init walk.
  // A single querySelectorAll pass here would permanently miss them (still carrying the CSS
  // opacity:0 default, no observer ever attached) on any device slow enough that Alpine's walk
  // outlasts the loader's fixed timer. boot()'s late-mount MutationObserver (below) re-runs
  // these same observe-functions for anything Alpine mounts after this first pass.
  let revealIO = null;

  // Read-only: is `el` already inside the viewport right now? No style writes here — kept separate
  // from applyRevealVisible() below so a batch of elements can all be READ before any of them WRITE
  // (see initReveals()). Interleaving read(el1)/write(el1)/read(el2)/write(el2)/... across many
  // elements in the same frame forces a synchronous layout recalc on every read — confirmed as the
  // top `forced-reflow-insight` contributor in a live Lighthouse trace before this fix.
  function isAlreadyVisible(el) {
    if (reduced || el.classList.contains("is-visible")) return false;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const margin = Math.round(vh * 0.08);
    return rect.top < vh - margin && rect.bottom > margin;
  }

  // Write-only counterpart to isAlreadyVisible() — call only after every element in the batch has
  // already been read, so no write in this pass can invalidate another element's pending read.
  function applyRevealVisible(el) {
    const delay = parseInt(el.getAttribute("data-delay") || "0", 10);
    el.style.setProperty("--reveal-delay", `${delay}ms`);
    if (delay) el.style.transitionDelay = `${delay}ms`;
    el.classList.add("is-visible");
    revealIO?.unobserve(el);
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
              el2.style.setProperty("--reveal-delay", `${delay}ms`);
              if (delay) el2.style.transitionDelay = `${delay}ms`;
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
  }

  // Late-mount path (initLateMountWatcher, below): elements trickle in one at a time as Alpine
  // mounts them, so a single-element read+write immediately after is cheap — no batch to thrash.
  function checkRevealVisibleNow(el) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (isAlreadyVisible(el)) applyRevealVisible(el);
      });
    });
  }

  function observeAndCheckReveal(el) {
    observeReveal(el);
    checkRevealVisibleNow(el);
  }

  function initReveals() {
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    els.forEach(observeReveal);
    if (reduced || !els.length) return;
    // Bulk initial pass: batch the whole page's worth of [data-reveal] elements into one shared
    // read-phase-then-write-phase double-rAF instead of each element scheduling its own interleaved
    // check — see isAlreadyVisible()/applyRevealVisible() above for why the interleaving was costly.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const toReveal = els.filter(isAlreadyVisible); // read phase — no writes yet
        toReveal.forEach(applyRevealVisible); // write phase — all reads already done
      });
    });
  }

  function revealStaggerRow(row) {
    const kids = row.children;
    const step = parseInt(row.getAttribute("data-stagger-step") || "85", 10);
    const base = parseInt(row.getAttribute("data-stagger-base") || "50", 10);
    for (let i = 0; i < kids.length; i++) {
      kids[i].style.setProperty("--reveal-delay", `${base + i * step}ms`);
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
        el.textContent = `${el.getAttribute("data-value") || "0"}${el.getAttribute("data-suffix") || ""}`;
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
          const run = (now) => {
            const t = Math.min((now - st) / dur, 1);
            el.textContent = `${Math.round(easeOutCubicOvershoot(t) * val)}${suf}`;
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
    if (size > FONT_BASE) document.documentElement.style.fontSize = `${size}px`;
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
          if (node.matches("[data-reveal]")) observeAndCheckReveal(node);
          if (node.matches("[data-stagger]")) observeStagger(node);
          node.querySelectorAll?.("[data-reveal]").forEach(observeAndCheckReveal);
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
