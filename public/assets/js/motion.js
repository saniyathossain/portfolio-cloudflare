/** Motion One — magnetic CTAs, hero tilt, pointer specular, scroll parallax */
(function () {
  const M = window.Motion;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const canEnhance = finePointer && !reduce;

  if (reduce || !M || typeof M.animate !== "function") return;
  const animate = M.animate;

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
    if (!canEnhance) return;
    let raf = 0;
    let pending = null;
    let current = null;
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
        current = el;
        pending = e;
        if (!raf) raf = requestAnimationFrame(apply);
      },
      { passive: true }
    );
  }

  let heroInView = true;
  let parallaxRaf = 0;

  function applyParallax(scrollY) {
    if (!canEnhance || !heroInView) return;
    const y = Math.min(scrollY * 0.06, 40);
    const wm = Math.min(scrollY * 0.035, 24);
    const liquid = Math.min(scrollY * 0.045, 32);
    document.documentElement.style.setProperty("--aurora-y", y.toFixed(1) + "px");
    document.documentElement.style.setProperty("--wm-parallax-y", wm.toFixed(1) + "px");
    document.documentElement.style.setProperty("--hero-liquid-y", liquid.toFixed(1) + "px");
    const glow = document.getElementById("heroGlow");
    if (glow) glow.style.setProperty("--glow-y", (y * 1.4).toFixed(1) + "px");
  }

  function scrollParallax() {
    if (!canEnhance) return;

    const hero = document.getElementById("home");
    if (hero && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          heroInView = entries.some((e) => e.isIntersecting);
          if (!heroInView) {
            document.documentElement.style.setProperty("--aurora-y", "0px");
            document.documentElement.style.setProperty("--wm-parallax-y", "0px");
            document.documentElement.style.setProperty("--hero-liquid-y", "0px");
          }
        },
        { root: null, threshold: 0, rootMargin: "0px 0px -20% 0px" }
      );
      io.observe(hero);
    }

    window.addEventListener(
      "scroll",
      () => {
        if (!parallaxRaf) {
          parallaxRaf = requestAnimationFrame(() => {
            parallaxRaf = 0;
            applyParallax(window.scrollY);
          });
        }
      },
      { passive: true }
    );
  }

  function boot() {
    document.querySelectorAll("[data-magnetic]").forEach((el) => magnetic(el));
    const card = document.querySelector(".hero-card");
    if (card && canEnhance) tilt(card);
    specular();
    scrollParallax();
    if (canEnhance) applyParallax(window.scrollY || 0);
  }

  window.addEventListener("portfolio-ready", boot);
  if (window.__portfolioReady) boot();
})();
