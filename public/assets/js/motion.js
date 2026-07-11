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
  // Position/height/speed are read once per collect (load + resize), not per scroll frame — calling
  // getBoundingClientRect() inside the scroll rAF forces a synchronous layout every frame for every
  // element. Instead cache each element's document-relative top (rect.top + scrollY at collect time,
  // which stays valid as the page scrolls since document coordinates don't shift) and derive the
  // viewport-relative top per frame with plain arithmetic (docTop - scrollY).
  let parallaxData = [];
  function collectParallax() {
    const scrollY = window.scrollY;
    parallaxData = Array.prototype.map.call(document.querySelectorAll("[data-parallax]"), (el) => {
      const r = el.getBoundingClientRect();
      const raw = el.getAttribute("data-parallax");
      const speed = parseFloat(
        (raw && raw !== "" ? raw : null) || el.getAttribute("data-parallax-speed") || "0.12"
      ) * parallaxScale;
      return { el, docTop: r.top + scrollY, height: r.height, speed };
    });
  }
  function applyElementParallax(scrollY) {
    if (reduce || !parallaxData.length) return;
    const vh = window.innerHeight;
    for (let i = 0; i < parallaxData.length; i++) {
      const d = parallaxData[i];
      const top = d.docTop - scrollY;
      if (top + d.height < -240 || top > vh + 240) continue; // skip far off-screen
      const offset = ((top + d.height / 2) - vh / 2) * -d.speed;
      d.el.style.setProperty("--parallax-y", offset.toFixed(1) + "px");
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
            const scrollY = window.scrollY;
            applyParallax(scrollY);
            applyElementParallax(scrollY);
          });
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", collectParallax, { passive: true });
    applyElementParallax(window.scrollY);
  }

  // When pill rows wrap (label reveal), glide their container height so everything below — the next
  // Experience role, Skills section, or the Stats ("Proof in the work") panel — slides instead of
  // jumping. Experience: .exp-details; Skills flat: .skills-flat; Skills cards: .glass-panel.
  function setupPillRowReflow() {
    const panelState = new WeakMap();
    const rootStyle = () => getComputedStyle(document.documentElement);

    function readReflowMs(fallback) {
      const n = parseFloat(rootStyle().getPropertyValue("--dur-pill-panel-reflow"));
      return Number.isFinite(n) ? Math.round(n * 1000) : fallback;
    }

    function readEase() {
      return rootStyle().getPropertyValue("--ease-pill-flip").trim()
        || "cubic-bezier(0.23, 0.84, 0.35, 1)";
    }

    function resolveReflowTarget(row) {
      if (!row) return null;

      const expPanel = row.closest(".exp-details");
      if (expPanel) {
        if (!expPanel.classList.contains("is-open")) return null;
        const inner = expPanel.querySelector(".exp-details__inner");
        if (!inner) return null;
        return { panel: expPanel, inner, kind: "exp" };
      }

      const skillsPanel = row.closest(".skills-flat__panel");
      if (skillsPanel) {
        const inner = skillsPanel.querySelector(".skills-flat__inner") || skillsPanel;
        return { panel: skillsPanel, inner, kind: "skills-flat" };
      }

      const skillsFlat = row.closest(".skills-flat");
      if (skillsFlat) {
        const inner = skillsFlat.querySelector(".skills-flat__inner") || skillsFlat;
        const panel = skillsFlat.querySelector(".skills-flat__panel") || skillsFlat;
        return { panel, inner, kind: "skills-flat" };
      }

      const skillCard = row.closest("#skills .glass-panel");
      if (skillCard) {
        return { panel: skillCard, inner: skillCard, kind: "skills-card" };
      }

      return null;
    }

    function compositorLayer(target) {
      if (!target) return null;
      const el = target.firstElementChild || target;
      el.style.willChange = "transform";
      el.style.transform = "translateZ(0)";
      return el;
    }

    function releaseCompositorLayer(el) {
      if (!el) return;
      el.style.willChange = "";
      el.style.transform = "";
    }

    function pinPanelHeight(panel) {
      if (!panel || panel._heightTimer) return;
      let inner = null;
      if (panel.classList.contains("exp-details")) {
        if (!panel.classList.contains("is-open")) return;
        inner = panel.querySelector(".exp-details__inner");
      } else if (panel.classList.contains("skills-flat__panel")) {
        inner = panel.querySelector(".skills-flat__inner");
      }
      if (!inner) return;
      const h = inner.scrollHeight;
      if (h < 2) return;
      panel.style.overflow = "hidden";
      panel.style.height = h + "px";
    }

    function readTargetHeight(panel, inner) {
      const prevH = panel.style.height;
      const prevO = panel.style.overflow;
      const prevT = panel.style.transition;
      panel.style.transition = "none";
      panel.style.height = "auto";
      panel.style.overflow = "visible";
      const h = inner.scrollHeight;
      panel.style.height = prevH;
      panel.style.overflow = prevO || "hidden";
      void panel.offsetHeight;
      panel.style.transition = prevT;
      return h;
    }

    function settlePanelHeight(panel, to) {
      panel.style.height = to + "px";
      panel.style.overflow = "hidden";
      requestAnimationFrame(() => { panel.style.transition = ""; });
    }

    function lockPanel(row) {
      const t = resolveReflowTarget(row);
      if (!t || t.panel._heightTimer) return null;
      t.panel.style.overflow = "hidden";
      t.panel.style.height = t.panel.offsetHeight + "px";
      return t;
    }

    function animate(target, ms, precomputedTo) {
      const panel = target.panel;
      const inner = target.inner;
      if (!panel || !inner) return;
      if (target.kind === "exp") {
        if (!panel.classList.contains("is-open") || panel._heightTimer) return;
      }

      let st = panelState.get(panel);
      if (!st) {
        st = { raf: 0, timer: 0, onEnd: null, layer: null };
        panelState.set(panel, st);
      }
      if (st.raf) cancelAnimationFrame(st.raf);

      const duration = ms || readReflowMs(440);
      panel._reflowLockUntil = performance.now() + duration + 140;

      st.raf = requestAnimationFrame(() => {
        st.raf = 0;
        if (!panel.style.height || panel.style.height === "auto") {
          panel.style.overflow = "hidden";
          panel.style.height = panel.offsetHeight + "px";
        }
        const from = panel.offsetHeight;
        const to = precomputedTo != null ? precomputedTo : readTargetHeight(panel, inner);

        if (Math.abs(from - to) < 2) {
          settlePanelHeight(panel, to);
          return;
        }

        clearTimeout(st.timer);
        if (st.onEnd) panel.removeEventListener("transitionend", st.onEnd);
        releaseCompositorLayer(st.layer);

        void panel.offsetHeight;

        st.layer = compositorLayer(inner);

        const finish = () => {
          clearTimeout(st.timer);
          if (st.onEnd) panel.removeEventListener("transitionend", st.onEnd);
          st.onEnd = null;
          releaseCompositorLayer(st.layer);
          st.layer = null;
          settlePanelHeight(panel, to);
        };

        st.onEnd = (e) => { if (e.propertyName === "height") finish(); };
        panel.addEventListener("transitionend", st.onEnd);
        st.timer = setTimeout(finish, duration + 80);

        panel.style.transition = "height " + duration + "ms " + readEase();
        panel.style.height = to + "px";
      });
    }

    function measureTarget(row) {
      const target = resolveReflowTarget(row);
      if (!target) return null;
      return readTargetHeight(target.panel, target.inner);
    }

    function reflowFromRow(row, ms, precomputedTo) {
      if (!row) return;
      const driven = precomputedTo != null;
      if (!driven) {
        if (row._reflowLockUntil > performance.now()) return;
        const peek = resolveReflowTarget(row);
        if (peek && peek.panel._reflowLockUntil > performance.now()) return;
      }
      const target = resolveReflowTarget(row);
      if (!target) return;
      animate(target, ms, precomputedTo);
      if (driven && ms) row._reflowLockUntil = performance.now() + ms + 150;
    }

    // Touch-only fallback — desktop uses flipRow reflow (avoid double height animations).
    if ("ResizeObserver" in window && document.documentElement.classList.contains("touch-pills")) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          reflowFromRow(entry.target);
        }
      });
      const bindRows = () => {
        document.querySelectorAll(".pill-row").forEach((row) => {
          if (row._pillReflowObs) return;
          row._pillReflowObs = true;
          ro.observe(row);
        });
      };
      const main = document.getElementById("main") || document.body;
      new MutationObserver(bindRows).observe(main, { childList: true, subtree: true });
      bindRows();
    }

    document.addEventListener("transitionend", (e) => {
      if (e.propertyName !== "height") return;
      const panel = e.target;
      if (!panel.classList) return;
      if (panel.classList.contains("exp-details")) {
        if (panel.classList.contains("is-open")) {
          // Bubble phase (not capture): runs after toggleRole()'s finish() clears inline height,
          // so pill-row reflow always has a pinned px baseline inside open accordions.
          requestAnimationFrame(() => pinPanelHeight(panel));
        } else {
          panel.style.height = "";
          panel.style.overflow = "";
        }
        return;
      }
      if (panel.classList.contains("skills-flat__panel")) {
        requestAnimationFrame(() => pinPanelHeight(panel));
      }
    }, false);

    document.querySelectorAll(".exp-details").forEach((panel) => {
      new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.attributeName !== "class") continue;
          if (panel.classList.contains("is-open")) {
            requestAnimationFrame(() => pinPanelHeight(panel));
          } else {
            panel.style.height = "";
            panel.style.overflow = "";
          }
        }
      }).observe(panel, { attributes: true, attributeFilter: ["class"] });
    });

    return { lock: lockPanel, reflow: reflowFromRow, pin: pinPanelHeight, measureTarget };
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
  // or close anything — the loop is impossible by construction, in every browser.
  //
  // Close policy (hybrid, tuned for 3-row skills-flat wrap):
  //  • elementFromPoint(clientX, clientY) — not e.target — so FLIP transforms don't mis-hit.
  //  • Stay open while the pointer is inside the open pill's bounds (expanded label included).
  //  • Leave the .pill-row entirely → close immediately.
  //  • Row gap / trailing whitespace → debounced close, deferred while a FLIP is still running.
  // Desktop-pointer-only via canEnhance; touch / reduced-motion show the static in-flow labels from CSS.
  function pillFlip(reflowPanel) {
    if (!canEnhance) return;
    const rootStyle = getComputedStyle(document.documentElement);
    const readSec = (name, fallback) => {
      const n = parseFloat(rootStyle.getPropertyValue(name));
      return Number.isFinite(n) ? n : fallback;
    };
    const OPEN_MS = Math.round(readSec("--dur-pill-flip-open", 0.52) * 1000);
    const CLOSE_MS = Math.round(readSec("--dur-pill-flip-close", 0.38) * 1000);
    const GAP_CLOSE_MS = 180;
    const EASE = rootStyle.getPropertyValue("--ease-pill-flip").trim()
      || "cubic-bezier(0.23, 0.84, 0.35, 1)";
    const rowTimers = new WeakMap(); // row -> cleanup timeout id
    let openPill = null;
    let gapCloseTimer = 0;
    let flipBusyUntil = 0;

    function pillsIn(row) {
      const out = [];
      for (let el = row.firstElementChild; el; el = el.nextElementSibling) {
        if (el.classList.contains("brand-pill")) out.push(el);
      }
      return out;
    }

    function cancelGapClose() {
      if (gapCloseTimer) { clearTimeout(gapCloseTimer); gapCloseTimer = 0; }
    }

    function scheduleGapClose() {
      cancelGapClose();
      gapCloseTimer = setTimeout(() => {
        gapCloseTimer = 0;
        clearOpen();
      }, GAP_CLOSE_MS);
    }

    function pillAt(x, y) {
      const el = document.elementFromPoint(x, y);
      return el && el.closest ? el.closest(".brand-pill") : null;
    }

    function rowAt(x, y) {
      const el = document.elementFromPoint(x, y);
      return el && el.closest ? el.closest(".pill-row") : null;
    }

    function pointInRect(x, y, rect, pad) {
      return (
        x >= rect.left - pad &&
        x <= rect.right + pad &&
        y >= rect.top - pad &&
        y <= rect.bottom + pad
      );
    }

    // FLIP every pill in `row` across the layout change `mutate()` makes.
    function flipRow(row, mutate, ms) {
      const pills = pillsIn(row);
      flipBusyUntil = performance.now() + ms + 80;
      row.classList.add("is-pill-moving");
      // FIRST — current visual positions (include any in-flight transforms from a prior interrupt).
      const first = pills.map((p) => p.getBoundingClientRect());
      // Clear in-flight transforms so LAST is measured against the clean final layout. No paint happens
      // between here and the Invert below (all synchronous), so this never flashes.
      pills.forEach((p) => { p.style.transition = "none"; p.style.transform = "none"; });
      if (reflowPanel) reflowPanel.lock(row);
      mutate();
      if (reflowPanel) {
        const to = reflowPanel.measureTarget(row);
        reflowPanel.reflow(row, ms, to);
      }
      // LAST — reading a rect forces the synchronous layout we need.
      const last = pills.map((p) => p.getBoundingClientRect());
      // INVERT — send each moved pill back to its old spot (transform only; layout stays final).
      const movers = [];
      pills.forEach((p, i) => {
        const dx = first[i].left - last[i].left;
        const dy = first[i].top - last[i].top;
        if (dx || dy) {
          p.style.willChange = "transform";
          p.style.transform = "translate3d(" + dx + "px," + dy + "px,0)";
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
            p.style.transform = "translate3d(0,0,0)";
          });
        });
      });
      // Strip inline transition/will-change once the glide settles so nothing lingers.
      clearTimeout(rowTimers.get(row));
      rowTimers.set(row, setTimeout(() => {
        row.classList.remove("is-pill-moving");
        pillsIn(row).forEach((p) => {
          p.style.transition = "none";
          p.style.willChange = "";
          p.style.transform = "";
        });
        requestAnimationFrame(() => {
          pillsIn(row).forEach((p) => { p.style.transition = ""; });
        });
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
      cancelGapClose();
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
      cancelGapClose();
      const pill = openPill, row = pill.parentElement;
      openPill = null;
      if (row) flipRow(row, () => pill.classList.remove("is-open"), CLOSE_MS);
      else pill.classList.remove("is-open");
    }

    function inPillRow(el) {
      return el && el.parentElement && el.parentElement.classList.contains("pill-row");
    }

    // Real-movement-only open/switch; hybrid close (see header). rAF-coalesced so a burst of
    // pointermoves does at most one layout pass per frame.
    let moveRaf = 0;
    let lastX = 0;
    let lastY = 0;
    function onMove(e) {
      lastX = e.clientX;
      lastY = e.clientY;
      if (moveRaf) return;
      moveRaf = requestAnimationFrame(() => {
        moveRaf = 0;
        const x = lastX;
        const y = lastY;
        const pill = pillAt(x, y);
        if (pill && inPillRow(pill)) {
          setOpen(pill);
          return;
        }
        if (!openPill) return;

        // Label expansion can outpace hit-target during FLIP — keep open while inside pill bounds.
        if (pointInRect(x, y, openPill.getBoundingClientRect(), 10)) {
          cancelGapClose();
          return;
        }

        const row = openPill.parentElement;
        const rowEl = rowAt(x, y);
        const inOpenRow = row && (rowEl === row || pointInRect(x, y, row.getBoundingClientRect(), 0));

        if (!inOpenRow) {
          clearOpen();
          return;
        }

        // Never arm a gap-close while FLIP is running — avoids cutting the glide short.
        if (performance.now() < flipBusyUntil) {
          cancelGapClose();
          return;
        }

        // Row gap / trailing whitespace — debounced close.
        scheduleGapClose();
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
  function pillTap(reflowPanel) {
    if (!document.documentElement.classList.contains("touch-pills")) return;
    const rootStyle = getComputedStyle(document.documentElement);
    const readMs = (name, fb) => {
      const n = parseFloat(rootStyle.getPropertyValue(name));
      return Number.isFinite(n) ? Math.round(n * 1000) : fb;
    };
    const OPEN_MS = readMs("--dur-pill-expand", 480);
    const CLOSE_MS_FLIP = readMs("--dur-pill-flip-close", 380);
    const CLOSE_MS = 2800;
    let openPill = null;
    let timer = 0;

    function clearTimer() {
      if (timer) { clearTimeout(timer); timer = 0; }
    }
    function close() {
      clearTimer();
      if (!openPill) return;
      const pill = openPill;
      const row = pill.parentElement;
      openPill = null;
      if (reflowPanel && row) reflowPanel.lock(row);
      pill.classList.remove("is-open");
      if (reflowPanel && row) {
        const to = reflowPanel.measureTarget(row);
        reflowPanel.reflow(row, CLOSE_MS_FLIP, to);
      }
    }
    function open(pill) {
      if (openPill && openPill !== pill) {
        const prev = openPill;
        const prevRow = prev.parentElement;
        if (reflowPanel && prevRow) reflowPanel.lock(prevRow);
        prev.classList.remove("is-open");
        if (reflowPanel && prevRow) {
          const prevTo = reflowPanel.measureTarget(prevRow);
          reflowPanel.reflow(prevRow, CLOSE_MS_FLIP, prevTo);
        }
      }
      openPill = pill;
      const row = pill.parentElement;
      if (reflowPanel && row) reflowPanel.lock(row);
      pill.classList.add("is-open");
      if (reflowPanel && row) {
        const to = reflowPanel.measureTarget(row);
        reflowPanel.reflow(row, OPEN_MS, to);
      }
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

  // Decorative infinite CSS animations (.beam conic-rotate, create-band pulse/float) only paused on
  // html.is-idle today — they keep repainting while merely scrolled off-screen. One shared observer
  // adds .is-paused (CSS: animation-play-state: paused) so scrolling past them costs nothing.
  function pauseOffscreenDecor() {
    if (reduce || !("IntersectionObserver" in window)) return;
    const targets = document.querySelectorAll(".beam, .create-band--flow");
    if (!targets.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.classList.toggle("is-paused", !e.isIntersecting);
      },
      { root: null, threshold: 0, rootMargin: "200px 0px" }
    );
    targets.forEach((el) => io.observe(el));
  }

  // iOS 26 "Liquid Glass" touch feedback for .menu-btn (header Menu button + the overlay's Close
  // button, same shared control) — a soft blob blooms from the exact press point and springs back
  // out on release (CSS: .menu-btn__ripple, driven by --tx/--ty here). Pointer Events cover
  // mouse/touch/pen in one listener; unconditional (not gated by canEnhance) since touch is the
  // primary target, not desktop hover.
  function liquidTouch() {
    const setPos = (el, e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--tx", x.toFixed(1) + "%");
      el.style.setProperty("--ty", y.toFixed(1) + "%");
    };
    document.querySelectorAll(".menu-btn").forEach((el) => {
      if (!el.querySelector(".menu-btn__ripple")) return;
      // Press bloom only (no cursor-following hover glow — removed by request): the ripple springs
      // from the exact press point, set here on pointerdown.
      el.addEventListener("pointerdown", (e) => { setPos(el, e); el.classList.add("is-pressed"); }, { passive: true });
      const release = () => el.classList.remove("is-pressed");
      el.addEventListener("pointerup", release, { passive: true });
      el.addEventListener("pointerleave", release, { passive: true });
      el.addEventListener("pointercancel", release, { passive: true });
    });
  }

  // Touch devices have no :hover, so the clock's grow-on-hover never fires. Tapping the analog face
  // toggles .is-zoomed (the same enlarged state the CSS applies on desktop hover); tapping anywhere
  // else closes it. Desktop keeps pure :hover — gating on (hover:none) avoids a click leaving the
  // clock stuck open there.
  function clockTapZoom() {
    const face = document.querySelector(".clock-face");
    if (!face) return;
    // Gate on the pointer that actually fired, not a media query: a mouse pointerup is left to the
    // CSS :hover path (so a desktop click never sticks the zoom), while touch/pen taps toggle it.
    // This is what makes the grow work on phones, where there is no :hover.
    const header = document.querySelector(".site-header");
    const setZoom = (on) => {
      face.classList.toggle("is-zoomed", on);
      // Flag the header too: on phones the enlarged face would overlap the brand mark to its left, so
      // CSS fades the brand out while zoomed (see .site-header.clock-zoomed .brand-btn).
      if (header) header.classList.toggle("clock-zoomed", on);
    };
    face.addEventListener("pointerup", (e) => {
      if (e.pointerType === "mouse") return;
      e.stopPropagation();
      setZoom(!face.classList.contains("is-zoomed"));
    });
    document.addEventListener("pointerup", (e) => {
      if (e.pointerType === "mouse") return;
      if (!(e.target && e.target.closest && e.target.closest(".clock-face"))) setZoom(false);
    }, { passive: true });
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
    const reflowPanel = setupPillRowReflow();
    pillFlip(reflowPanel);
    pillTap(reflowPanel);
    pauseOffscreenDecor();
    liquidTouch();
    clockTapZoom();
    if (!reduce) applyParallax(window.scrollY || 0);
  }

  window.addEventListener("portfolio-ready", boot);
  if (window.__portfolioReady) boot();
})();
