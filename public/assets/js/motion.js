/** Motion One — magnetic CTAs, hero tilt, pointer specular */
(function () {
  const M = window.Motion;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !M || typeof M.animate !== "function") return;
  const animate = M.animate;

  // Soft macOS-Tahoe springs — gentle settle with a whisper of overshoot
  const springSnappy = { type: "spring", stiffness: 340, damping: 30, mass: 0.6 };
  const springSoft = { type: "spring", stiffness: 220, damping: 28, mass: 0.7 };

  function magnetic(el, strength) {
    strength = strength || 0.14;
    let raf = 0;
    function move(e) {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        animate(el, { x: dx * strength, y: dy * strength }, springSnappy);
      });
    }
    function leave() {
      animate(el, { x: 0, y: 0 }, springSoft);
    }
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
  }

  function tilt(el, max) {
    max = max || 5;
    let raf = 0;
    function move(e) {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        animate(el, { rotateY: px * max, rotateX: -py * max }, springSoft);
      });
    }
    function leave() {
      animate(el, { rotateX: 0, rotateY: 0 }, springSoft);
    }
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
  }

  function specular() {
    let raf = 0, pending = null, current = null;
    function apply() {
      raf = 0;
      if (!pending || !current) return;
      const r = current.getBoundingClientRect();
      const px = ((pending.clientX - r.left) / r.width) * 100;
      const py = ((pending.clientY - r.top) / r.height) * 100;
      current.style.setProperty("--px", px.toFixed(1) + "%");
      current.style.setProperty("--py", py.toFixed(1) + "%");
    }
    document.addEventListener(
      "pointermove",
      (e) => {
        const el = e.target.closest && e.target.closest(".spec");
        if (!el) return;
        current = el; pending = e;
        if (!raf) raf = requestAnimationFrame(apply);
      },
      { passive: true }
    );
  }

  function boot() {
    document.querySelectorAll("[data-magnetic]").forEach((el) => magnetic(el));
    const card = document.querySelector(".hero-card");
    if (card) tilt(card);
    specular();
  }

  window.addEventListener("portfolio-ready", boot);
  if (window.__portfolioReady) boot();
})();
