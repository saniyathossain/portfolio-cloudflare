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
            e.target.classList.add("is-visible");
            const delay = parseInt(e.target.getAttribute("data-delay") || "0", 10);
            if (delay) e.target.style.transitionDelay = delay + "ms";
            io.unobserve(e.target);
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
          const row = e.target;
          const kids = row.children;
          for (let i = 0; i < kids.length; i++) {
            kids[i].style.transitionDelay = i * 58 + "ms";
          }
          row.classList.add("is-visible");
          io.unobserve(row);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
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

  function boot() {
    initReveals();
    initWordReveal();
    initStagger();
    initCountUp();
    applyAdaptiveGrid();
    window.addEventListener("resize", applyAdaptiveGrid);
  }

  window.addEventListener("portfolio-ready", boot);
  if (window.__portfolioReady) boot();
})();
