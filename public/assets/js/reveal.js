/** Scroll reveals + word split + stats count-up */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initReveals() {
    const els = document.querySelectorAll("[data-reveal]");
    if (reduced) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const el = e.target;
            const delay = parseInt(el.getAttribute("data-delay") || "0", 10);
            el.style.setProperty("--reveal-delay", delay + "ms");
            if (delay) el.style.transitionDelay = delay + "ms";
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                el.classList.add("is-visible");
              });
            });
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
  }

  function initWordReveal() {
    document.querySelectorAll(".word-reveal").forEach((wrap) => {
      const raw = wrap.getAttribute("data-text") || wrap.textContent;
      wrap.textContent = "";
      const words = raw.trim().split(/\s+/);
      words.forEach((w, i) => {
        const s = document.createElement("span");
        s.className = "word";
        s.textContent = w;
        s.style.transitionDelay = i * 48 + "ms";
        wrap.appendChild(s);
        if (i < words.length - 1) wrap.appendChild(document.createTextNode(" "));
      });
      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            wrap.classList.add("is-visible");
            io.disconnect();
          }
        },
        { threshold: 0.2 }
      );
      io.observe(wrap);
    });
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

  function initStagger() {
    const rows = document.querySelectorAll("[data-stagger]");
    if (reduced) {
      rows.forEach((r) => r.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          revealStaggerRow(e.target);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
    );
    rows.forEach((r) => io.observe(r));
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

  function boot() {
    initReveals();
    initWordReveal();
    initStagger();
    initCountUp();
    initScrollProgress();
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
