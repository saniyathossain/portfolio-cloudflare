/**
 * Motion — pointer specular + scroll parallax (vanilla, always on desktop); magnetic CTAs + hero
 * tilt (Motion One).
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const canEnhance = finePointer && !reduce;
  // Touch parallax is half the desktop ranges — present but cheap.
  const parallaxScale = coarsePointer ? 0.5 : 1;

  if (reduce) return; // reduced-motion: nothing animates.

  // Shared rAF-lerp "spring" — same settle-toward-target idiom heroSpatial() below already hand-rolls
  // for the hero parallax, reused here for magnetic()/tilt() instead of pulling in Motion One (a
  // 65KB, desktop-only, fine-pointer-gated dependency) for what boils down to two pointer-follow
  // effects. `stiffness` is the per-frame lerp fraction (higher = snappier); settle threshold stops
  // the rAF loop once the values are visually at rest instead of looping forever at ~0.
  function makeSpring(el, apply, stiffness) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    function tick() {
      cx += (tx - cx) * stiffness;
      cy += (ty - cy) * stiffness;
      apply(el, cx, cy);
      raf = (Math.abs(tx - cx) > 0.02 || Math.abs(ty - cy) > 0.02) ? requestAnimationFrame(tick) : 0;
    }
    return {
      set(x, y) { tx = x; ty = y; if (!raf) raf = requestAnimationFrame(tick); },
    };
  }

  function magnetic(el, strength) {
    strength = strength || 0.14;
    const spring = makeSpring(el, (node, x, y) => {
      node.style.transform = "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px)";
    }, 0.22);
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      spring.set(dx * strength, dy * strength);
    });
    el.addEventListener("pointerleave", () => spring.set(0, 0));
  }

  function tilt(el, max) {
    max = max || 5;
    const spring = makeSpring(el, (node, rx, ry) => {
      node.style.transform = "rotateY(" + rx.toFixed(2) + "deg) rotateX(" + ry.toFixed(2) + "deg)";
    }, 0.18);
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      spring.set(px * max, -py * max);
    });
    el.addEventListener("pointerleave", () => spring.set(0, 0));
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
    if (reduce || !heroInView) return;
    const s = parallaxScale;
    const y = Math.min(scrollY * 0.10 * s, 70 * s);
    const wm = Math.min(scrollY * 0.06 * s, 48 * s);
    const liquid = Math.min(scrollY * 0.08 * s, 56 * s);
    document.documentElement.style.setProperty("--aurora-y", y.toFixed(1) + "px");
    document.documentElement.style.setProperty("--wm-parallax-y", wm.toFixed(1) + "px");
    document.documentElement.style.setProperty("--hero-liquid-y", liquid.toFixed(1) + "px");
    const glow = document.getElementById("heroGlow");
    if (glow) glow.style.setProperty("--glow-y", (y * 1.4).toFixed(1) + "px");
  }

  // Generic depth parallax for any [data-parallax] element — transform-only, in-view only, cheap.
  // Speed is the attribute value (data-parallax="0.05"); data-parallax-speed kept as legacy alias.
  let parallaxEls = [];
  function collectParallax() {
    parallaxEls = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  }
  function applyElementParallax() {
    if (reduce || !parallaxEls.length) return;
    const vh = window.innerHeight;
    for (let i = 0; i < parallaxEls.length; i++) {
      const el = parallaxEls[i];
      const r = el.getBoundingClientRect();
      if (r.bottom < -240 || r.top > vh + 240) continue; // skip far off-screen
      const raw = el.getAttribute("data-parallax");
      const speed = parseFloat(
        (raw && raw !== "" ? raw : null) ||
          el.getAttribute("data-parallax-speed") ||
          "0.12"
      ) * parallaxScale;
      const offset = ((r.top + r.height / 2) - vh / 2) * -speed;
      el.style.setProperty("--parallax-y", offset.toFixed(1) + "px");
    }
  }

  function scrollParallax() {
    if (reduce) return;
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
  // grid column that flips 0fr→1fr the instant a pill gets .is-open, so the flex row reflows to its
  // final layout in a single frame (no per-frame line-break juggle); flipRow() then animates that
  // reflow — snapshot EVERY pill's position First, toggle .is-open and read Last, Invert each moved
  // pill back with a transform, and Play to identity next frame, so neighbours (and the opening pill
  // itself, if it wraps) glide to their new spots instead of teleporting.
  //
  // CRITICAL — anti-oscillation. Open/switch is driven ONLY by real pointer *movement* (pointermove),
  // never by pointerover/pointerout. At narrow widths a growing pill can wrap to the next line and
  // relocate out from under a STATIONARY cursor; Chromium then fires pointerout on that layout-induced
  // hit-target change, and a pointerout-driven close would collapse→return→reopen→wrap forever (the
  // Chrome "juggle"). A relocating pill under a still cursor fires NO pointermove, so it can never open
  // or close anything — the loop is impossible by construction, in every browser. We close only when the
  // pointer genuinely leaves the .pill-row. Desktop-pointer-only via canEnhance; touch / reduced-motion
  // show the static in-flow labels from CSS.
  function pillFlip() {
    if (!canEnhance) return;
    const OPEN_MS = 440, CLOSE_MS = 300;
    const EASE = "cubic-bezier(0.2, 0.68, 0.32, 1)"; // soft ease-out, no overshoot
    const rowTimers = new WeakMap(); // row -> cleanup timeout id
    let openPill = null;

    function pillsIn(row) {
      const out = [];
      for (let el = row.firstElementChild; el; el = el.nextElementSibling) {
        if (el.classList.contains("brand-pill")) out.push(el);
      }
      return out;
    }

    // FLIP every pill in `row` across the layout change `mutate()` makes.
    function flipRow(row, mutate, ms) {
      const pills = pillsIn(row);
      // FIRST — current visual positions (include any in-flight transforms from a prior interrupt).
      const first = pills.map((p) => p.getBoundingClientRect());
      // Clear in-flight transforms so LAST is measured against the clean final layout. No paint happens
      // between here and the Invert below (all synchronous), so this never flashes.
      pills.forEach((p) => { p.style.transition = "none"; p.style.transform = "none"; });
      mutate();
      // LAST — reading a rect forces the synchronous layout we need.
      const last = pills.map((p) => p.getBoundingClientRect());
      // INVERT — send each moved pill back to its old spot (transform only; layout stays final).
      const movers = [];
      pills.forEach((p, i) => {
        const dx = first[i].left - last[i].left;
        const dy = first[i].top - last[i].top;
        if (dx || dy) {
          p.style.willChange = "transform";
          p.style.transform = "translate(" + dx + "px," + dy + "px)";
          movers.push(p);
        } else {
          p.style.transition = "";
          p.style.transform = "";
        }
      });
      // PLAY — two rAFs guarantee the Invert frame committed before we transition to identity.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          movers.forEach((p) => {
            p.style.transition = "transform " + ms + "ms " + EASE;
            p.style.transform = "";
          });
        });
      });
      // Strip inline transition/will-change once the glide settles so nothing lingers.
      clearTimeout(rowTimers.get(row));
      rowTimers.set(row, setTimeout(() => {
        pillsIn(row).forEach((p) => { p.style.transition = ""; p.style.willChange = ""; });
      }, ms + 100));
    }

    // The row's own [data-stagger] scroll-reveal drives each pill's transform via a CSS transition
    // (styles.css .pill-row[data-stagger] .brand-pill). flipRow() ALSO writes pill.style.transform
    // directly (inline style always wins over a CSS transition), so opening a pill mid-reveal would
    // clobber the stagger-in animation — visible stutter, worse on slow devices where the reveal
    // window stays open longer relative to how fast a pointer can reach the row. Skip FLIP entirely
    // while the row hasn't finished revealing; the pointer can still re-trigger it once settled.
    function stillRevealing(row) {
      return row.hasAttribute("data-stagger") && !row.classList.contains("is-visible");
    }

    function setOpen(pill) {
      if (pill === openPill) return;
      const prev = openPill;
      const prevRow = prev && prev.parentElement;
      const row = pill.parentElement;
      if (!row || stillRevealing(row)) return;
      // Different rows: collapse the old row separately (no conflict — disjoint pill sets).
      if (prev && prevRow && prevRow !== row) {
        flipRow(prevRow, () => prev.classList.remove("is-open"), CLOSE_MS);
      }
      openPill = pill;
      flipRow(row, () => {
        if (prev && prevRow === row) prev.classList.remove("is-open");
        pill.classList.add("is-open");
      }, OPEN_MS);
    }

    function clearOpen() {
      if (!openPill) return;
      const pill = openPill, row = pill.parentElement;
      openPill = null;
      if (row) flipRow(row, () => pill.classList.remove("is-open"), CLOSE_MS);
      else pill.classList.remove("is-open");
    }

    function inPillRow(el) {
      return el && el.parentElement && el.parentElement.classList.contains("pill-row");
    }

    // Real-movement-only open/switch; close on leaving the row. rAF-coalesced so a burst of
    // pointermoves does at most one layout pass per frame.
    let moveRaf = 0, lastTarget = null;
    function onMove(e) {
      lastTarget = e.target;
      if (moveRaf) return;
      moveRaf = requestAnimationFrame(() => {
        moveRaf = 0;
        const t = lastTarget;
        const pill = t && t.closest && t.closest(".brand-pill");
        if (pill && inPillRow(pill)) setOpen(pill);
        else if (openPill && !(t && t.closest && t.closest(".pill-row"))) clearOpen();
        // else: within a row but over a gap → keep the current pill open.
      });
    }
    document.addEventListener("pointermove", onMove, { passive: true });

    // Keyboard: focus opens, blur closes. Focus never moves under a stationary cursor, so no loop.
    document.addEventListener("focusin", (e) => {
      const pill = e.target.closest && e.target.closest(".brand-pill");
      if (pill && inPillRow(pill)) setOpen(pill);
      else clearOpen();
    });
    document.addEventListener("focusout", (e) => {
      if (openPill && e.target.closest && e.target.closest(".brand-pill") === openPill) {
        if (!e.relatedTarget || !openPill.contains(e.relatedTarget)) clearOpen();
      }
    });
  }

  // Touch brand-pill reveal — gated on html.touch-pills (boot.js). Mutually exclusive with pillFlip
  // (fine-pointer). Opens one pill; auto-closes on other-pill / outside tap / scroll / timer.
  function pillTap() {
    if (!document.documentElement.classList.contains("touch-pills")) return;
    const CLOSE_MS = 2500;
    let openPill = null;
    let timer = 0;

    function clearTimer() {
      if (timer) { clearTimeout(timer); timer = 0; }
    }
    function close() {
      clearTimer();
      if (!openPill) return;
      openPill.classList.remove("is-open");
      openPill = null;
    }
    function open(pill) {
      if (openPill && openPill !== pill) openPill.classList.remove("is-open");
      openPill = pill;
      pill.classList.add("is-open");
      clearTimer();
      timer = setTimeout(close, CLOSE_MS);
    }

    document.addEventListener("click", (e) => {
      const pill = e.target.closest && e.target.closest(".brand-pill");
      if (pill && pill.parentElement && pill.parentElement.classList.contains("pill-row")) {
        e.preventDefault();
        if (openPill === pill) close();
        else open(pill);
        return;
      }
      if (openPill) close();
    });
    window.addEventListener("scroll", close, { passive: true });
  }

  function boot() {
    if (canEnhance) {
      document.querySelectorAll("[data-magnetic]").forEach((el) => magnetic(el));
      const card = document.querySelector(".hero-card");
      if (card) tilt(card);
    }
    specular();
    scrollParallax();
    heroSpatial();
    pillFlip();
    pillTap();
    if (!reduce) applyParallax(window.scrollY || 0);
  }

  window.addEventListener("portfolio-ready", boot);
  if (window.__portfolioReady) boot();
})();
