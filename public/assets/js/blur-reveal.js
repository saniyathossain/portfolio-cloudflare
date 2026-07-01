/** Blur-reveal text — Spell UI-inspired, vanilla (no React/npm) */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function splitWords(el) {
    const raw = el.getAttribute("data-blur-reveal") || el.getAttribute("data-text") || el.textContent;
    el.textContent = "";
    el.classList.add("blur-reveal");
    const speed = parseFloat(el.getAttribute("data-blur-speed") || "1");
    const seg = parseFloat(el.getAttribute("data-blur-segment") || "0.07");
    const words = raw.trim().split(/\s+/);
    words.forEach((w, i) => {
      const s = document.createElement("span");
      s.className = "blur-reveal__word";
      s.textContent = w;
      s.style.transitionDuration = seg * speed + "s";
      s.style.transitionDelay = i * seg * speed + "s";
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  }

  function init() {
    const els = document.querySelectorAll("[data-blur-reveal]");
    if (!els.length) return;

    if (reduced) {
      els.forEach((el) => {
        if (!el.classList.contains("blur-reveal")) {
          const t = el.getAttribute("data-blur-reveal") || el.textContent;
          el.textContent = t;
        }
        el.classList.add("is-visible");
      });
      return;
    }

    els.forEach(splitWords);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const delay = parseInt(e.target.getAttribute("data-delay") || "0", 10);
          if (delay) e.target.style.setProperty("--blur-delay", delay + "ms");
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }
    );
    els.forEach((el) => io.observe(el));
  }

  window.addEventListener("portfolio-ready", init);
  if (window.__portfolioReady) init();
})();
