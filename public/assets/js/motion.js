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

  // iOS-style spatial parallax for the hero image: the image plane drifts opposite the pointer,
  // independent of (but composed with, in CSS) the scroll-linked --hero-liquid-y on the same
  // element. Hand-rolled spring (not Motion One's animate()) because animate() writes a competing
  // inline style.transform that would silently clobber the scroll transform's CSS custom-property
  // value — this settle loop only ever touches --hero-spatial-x/y.
  function heroSpatial() {
    if (!canEnhance) return;
    const hero = document.getElementById("home");
    const layer = document.getElementById("heroLiquid");
    if (!hero || !layer) return;
    const RANGE_X = 9;
    const RANGE_Y = 7;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    function settle() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      layer.style.setProperty("--hero-spatial-x", cx.toFixed(2) + "px");
      layer.style.setProperty("--hero-spatial-y", cy.toFixed(2) + "px");
      raf = (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) ? requestAnimationFrame(settle) : 0;
    }
    function kick() {
      if (!raf) raf = requestAnimationFrame(settle);
    }
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      tx = (((e.clientX - r.left) / r.width) - 0.5) * -2 * RANGE_X;
      ty = (((e.clientY - r.top) / r.height) - 0.5) * -2 * RANGE_Y;
      kick();
    }, { passive: true });
    hero.addEventListener("pointerleave", () => {
      tx = 0; ty = 0;
      kick();
    });
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

  // Icon→label hover reveal, smoothed with FLIP (First, Last, Invert, Play). The label is an IN-FLOW
  // grid column that flips from 0fr to 1fr the instant a pill gets .is-open, so the flex row reflows to
  // its final layout in a single frame (no per-frame line-break juggle). We then animate that reflow:
  // snapshot every sibling's position First, toggle .is-open and read the Last positions, Invert each
  // moved sibling back to where it was with a transform, then Play it to identity next frame — so
  // neighbours glide aside / wrap to the next line and slide back on un-hover, and nothing ever
  // overlaps in the resting state. The hovered pill's own growth is CSS (width flip + text fade); FLIP
  // touches ONLY the siblings, so it never fights the pill's :hover lift transform. Delegated listeners,
  // desktop-pointer-only via canEnhance; touch / reduced-motion show the static in-flow labels from CSS.
  function pillFlip() {
    if (!canEnhance) return;
    const DUR = 300;
    const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";
    const rowTimers = new WeakMap(); // row -> cleanup timeout id

    function siblingsOf(pill) {
      const out = [];
      for (let el = pill.parentElement.firstElementChild; el; el = el.nextElementSibling) {
        if (el !== pill && el.classList.contains("brand-pill")) out.push(el);
      }
      return out;
    }

    function flip(pill, open) {
      const row = pill.parentElement;
      if (!row) return;
      const sibs = siblingsOf(pill);
      // FIRST — current visual positions (include any in-flight transforms from a prior interrupt).
      const first = sibs.map((s) => s.getBoundingClientRect());
      // Clear in-flight transforms so LAST is measured against the clean, final layout. No paint
      // happens between here and the Invert below (all synchronous), so this never flashes.
      sibs.forEach((s) => { s.style.transition = "none"; s.style.transform = "none"; });
      // Mutate to the final layout INSTANTLY (label width has no CSS transition).
      pill.classList.toggle("is-open", open);
      // LAST — reading a rect forces the synchronous layout we need.
      const last = sibs.map((s) => s.getBoundingClientRect());
      // INVERT — send each moved sibling back to its old spot (transform only; layout stays final).
      const movers = [];
      sibs.forEach((s, i) => {
        const dx = first[i].left - last[i].left;
        const dy = first[i].top - last[i].top;
        if (dx || dy) {
          s.style.willChange = "transform";
          s.style.transform = "translate(" + dx + "px," + dy + "px)";
          movers.push(s);
        } else {
          s.style.transition = "";
          s.style.transform = "";
        }
      });
      // PLAY — two rAFs guarantee the Invert frame committed before we transition to identity.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          movers.forEach((s) => {
            s.style.transition = "transform " + DUR + "ms " + EASE;
            s.style.transform = "";
          });
        });
      });
      // Strip inline transition/will-change once the glide settles so nothing lingers to fight the
      // next hover (transform is already back to identity from Play).
      clearTimeout(rowTimers.get(row));
      rowTimers.set(row, setTimeout(() => {
        siblingsOf(pill).forEach((s) => { s.style.transition = ""; s.style.willChange = ""; });
      }, DUR + 90));
    }

    function onOpen(e) {
      const pill = e.target.closest && e.target.closest(".brand-pill");
      if (!pill || pill.__pillOpen) return;
      pill.__pillOpen = 1;
      flip(pill, true);
    }
    function onClose(e) {
      const pill = e.target.closest && e.target.closest(".brand-pill");
      if (!pill || !pill.__pillOpen) return;
      if (e.relatedTarget && pill.contains(e.relatedTarget)) return; // moved onto a child — still inside
      pill.__pillOpen = 0;
      flip(pill, false);
    }

    document.addEventListener("pointerover", onOpen, { passive: true });
    document.addEventListener("pointerout", onClose, { passive: true });
    document.addEventListener("focusin", onOpen);
    document.addEventListener("focusout", onClose);
  }

  function boot() {
    if (canEnhance && hasMotion) {
      document.querySelectorAll("[data-magnetic]").forEach((el) => magnetic(el));
      const card = document.querySelector(".hero-card");
      if (card) tilt(card);
    }
    specular();
    scrollParallax();
    heroSpatial();
    pillFlip();
    if (canEnhance) applyParallax(window.scrollY || 0);
  }

  window.addEventListener("portfolio-ready", boot);
  if (window.__portfolioReady) boot();
})();
