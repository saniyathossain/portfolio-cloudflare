/** Motion — pointer specular + scroll parallax (vanilla, always on desktop); magnetic CTAs + hero tilt (Motion One) */
(function () {
  const M = window.Motion;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const canEnhance = finePointer && !reduce;

  if (reduce) return; // reduced-motion: nothing animates. Specular/parallax below are vanilla; only magnetic/tilt need Motion One.
  const hasMotion = !!(M && typeof M.animate === "function");
  const animate = hasMotion ? M.animate : null;

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
    const y = Math.min(scrollY * 0.10, 70);
    const wm = Math.min(scrollY * 0.06, 48);
    const liquid = Math.min(scrollY * 0.08, 56);
    document.documentElement.style.setProperty("--aurora-y", y.toFixed(1) + "px");
    document.documentElement.style.setProperty("--wm-parallax-y", wm.toFixed(1) + "px");
    document.documentElement.style.setProperty("--hero-liquid-y", liquid.toFixed(1) + "px");
    const glow = document.getElementById("heroGlow");
    if (glow) glow.style.setProperty("--glow-y", (y * 1.4).toFixed(1) + "px");
  }

  // Generic depth parallax for any [data-parallax] element — transform-only, in-view only, cheap.
  let parallaxEls = [];
  function collectParallax() {
    parallaxEls = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  }
  function applyElementParallax() {
    if (!canEnhance || !parallaxEls.length) return;
    const vh = window.innerHeight;
    for (let i = 0; i < parallaxEls.length; i++) {
      const el = parallaxEls[i];
      const r = el.getBoundingClientRect();
      if (r.bottom < -240 || r.top > vh + 240) continue; // skip far off-screen
      const speed = parseFloat(el.getAttribute("data-parallax-speed") || "0.12");
      const offset = ((r.top + r.height / 2) - vh / 2) * -speed;
      el.style.setProperty("--parallax-y", offset.toFixed(1) + "px");
    }
  }

  function scrollParallax() {
    if (!canEnhance) return;
    collectParallax();

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
            applyElementParallax();
          });
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", collectParallax, { passive: true });
    applyElementParallax();
  }

  function boot() {
    if (canEnhance && hasMotion) {
      document.querySelectorAll("[data-magnetic]").forEach((el) => magnetic(el));
      const card = document.querySelector(".hero-card");
      if (card) tilt(card);
    }
    specular();
    scrollParallax();
    if (canEnhance) applyParallax(window.scrollY || 0);
  }

  window.addEventListener("portfolio-ready", boot);
  if (window.__portfolioReady) boot();
})();
