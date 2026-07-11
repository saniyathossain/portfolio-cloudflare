/**
 * Alpine.js portfolio app — nav, modal, clock, carousel, experience toggles.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */

// Centralised timing (ms) & threshold constants — keeps the numbers below self-documenting and in
// one place to tune, instead of scattered magic literals across the component methods.
const T = {
  CLOCK_TICK: 1000,     // analog/text clock refresh
  BACK_TO_TOP_PX: 560,  // scrollY past which the back-to-top control appears
  HERO_SETTLE: 120,     // re-check hero contrast shortly after fonts/layout settle
  LIQUID_WARP: 700,     // max life of the scroll-warp pulse (scrollend fallback)
  FORM_SUBMIT: 900,     // stubbed contact submit -> success state
  CARD_SWAP: 240,       // hero "Now" card content-swap exit
  ROLE_OPEN: 420,       // experience accordion expand
  ROLE_CLOSE: 300,      // experience accordion collapse
  MODAL_RESET: 300,     // clear modal state after close animation
  MENU_HANDOFF: 60,     // menu -> modal handoff (keeps scroll-lock continuous)
  NAV_SCROLL: 80,       // delay before smooth-scroll after menu close
};
const HERO_ON_DARK_LUM = 0.58; // luminance below which hero text flips to its on-dark treatment

function portfolioApp() {
  const D = window.PORTFOLIO_DATA || {};
  // Pre-hydration fallback only (overwritten by init() the instant portfolio.json resolves) — no
  // specific years/roles/companies count here since those are computed from data this module
  // doesn't have yet, and a stale hardcoded number is exactly the drift this was fixed to avoid.
  const sections = D.sections || {
    services: "Backend, architecture, APIs, and AI-assisted delivery.",
    experience: "Backend and mobile engineering, shipped across companies.",
    skills: "Languages, frameworks, data, platform, and AI in the flow.",
    education: "Electronics & Telecommunication Engineering — Dhaka.",
  };
  return {
    menuOpen: false,
    modalOpen: false,
    showBackToTop: false,
    scrolled: false,
    submitting: false,
    success: false,
    formError: "",
    cardIndex: 0,
    clockTime: "9:41am",
    clockDate: "12 March, 2025",
    clockAngleH: 0,
    clockAngleM: 0,
    clockAngleS: 0,
    clockSecondDelay: "0s",
    openRoles: {},
    // Sticky, never reverts on re-collapse — see hasOpenedOnce()/toggleRole() below.
    openedRoles: {},
    currentYear: new Date().getFullYear(),
    heroCards: D.heroCards,
    nav: D.nav,
    partners: D.partners,
    services: D.services,
    stats: D.stats,
    skills: D.skills,
    education: D.education,
    socials: D.socials,
    experienceGroups: D.experienceGroups,
    profile: D.profile,
    site: D.site,
    sections,

    init() {
      const live = window.PORTFOLIO_DATA;
      if (live?.sections) this.sections = live.sections;
      if (live?.experienceGroups) {
        const normalize = live.normalizeRole || ((role) => role);
        this.experienceGroups = live.experienceGroups.map((group) => ({
          ...group,
          roles: (group.roles || []).map((role) => normalize(role)),
        }));
      }
      if (live?.skills) this.skills = live.skills;
      this.tickClock();
      this.initClockSweep();
      setInterval(() => this.tickClock(), T.CLOCK_TICK);
      this.setupHeroGlow();
      this.setupHeroContrast();
      this.$nextTick(() => this.setupNavPill());
      // Guard against a second registration if init() ever runs twice — Alpine inits a component
      // once, but this keeps the global keydown listener from stacking duplicates regardless.
      if (!this._onKey) {
        this._onKey = (e) => {
          if (e.key === "Escape") {
            if (this.modalOpen) this.closeModal();
            else if (this.menuOpen) this.closeMenu();
          }
        };
        window.addEventListener("keydown", this._onKey);
      }
      this.setupBackToTop();
      this.setupIdlePause();
    },

    // Battery optimisation: pause every always-on decorative animation (the aurora drift, the .beam
    // rotations, the brand sheen — see the `html.is-idle` rules in styles.css) whenever the page is
    // hidden OR the window loses focus, and resume on return. Continuously compositing those while the
    // user is in another app is pure wasted GPU/battery, and freezing them off-screen is invisible.
    // (The aurora *canvas* pauses itself in aurora.js; this covers the CSS-driven animations.)
    setupIdlePause() {
      const root = document.documentElement;
      const idle = () => {
        root.classList.add("is-idle");
        // `is-idle` only pauses @keyframes-driven decorations (browsers can't pause a CSS
        // transition). A transition mid-flight when the tab loses focus would otherwise freeze at
        // whatever value it happened to reach and resume from there on return — jarring for the
        // #main liquid-warp blur/scale pulse specifically, since a very-mid-blur frozen frame reads
        // as a rendering glitch, not a paused effect. Settle it to its resting state immediately
        // instead of waiting for its own scrollend/timeout cleanup to eventually fire.
        const main = document.getElementById("main");
        if (main && main.classList.contains("is-liquid-warp")) {
          clearTimeout(this._warpTimer);
          main.classList.remove("is-liquid-warp");
        }
      };
      const active = () => root.classList.remove("is-idle");
      document.addEventListener("visibilitychange", () => { if (document.hidden) idle(); else active(); });
      window.addEventListener("blur", idle);
      window.addEventListener("focus", active);
    },

    // rAF-coalesced like reveal.js's scroll-progress bar — one threshold check per frame, not one
    // per scroll event, so a fast wheel-fling can't flood Alpine's reactivity with redundant writes.
    setupBackToTop() {
      let raf = 0;
      const check = () => {
        raf = 0;
        this.showBackToTop = window.scrollY > T.BACK_TO_TOP_PX;
        // Header glass intensifies once it floats over page content (past the very top).
        this.scrolled = window.scrollY > 12;
      };
      window.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(check); }, { passive: true });
      check();
    },

    setupHeroGlow() {
      const hero = document.getElementById("home");
      const glow = document.getElementById("heroGlow");
      if (!hero || !glow) return;
      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        glow.style.left = x + "%";
        glow.style.top = y + "%";
        glow.style.opacity = "1";
      });
      hero.addEventListener("pointerleave", () => { glow.style.opacity = "0"; });
    },

    /** Sliding "liquid" nav pill: rests under the active section, glides to the hovered/focused item.
     *  Position is written as CSS custom props via el.style (no inline style="" markup, no per-frame
     *  JS loop) — the pill's own CSS transition does the gliding on the compositor. */
    setupNavPill() {
      const nav = this.$el && this.$el.querySelector(".nav-desktop");
      if (!nav) return;
      const pill = nav.querySelector(".nav-desktop__pill");
      const btns = Array.from(nav.querySelectorAll("button"));
      if (!pill || !btns.length) return;
      const ids = (this.nav || []).map((n) => n.id);
      let activeIdx = 0;
      let hoverIdx = -1;

      // iOS Music-app droplet squash: whenever the lens actually changes destination, flag it
      // "traveling" for the flight duration — CSS squashes it scaleY mid-flight and the transition's
      // own overshoot springs it back on arrival. Class-toggle only; visuals are reduced-motion
      // gated in CSS, and the guard here spares the timer churn for reduce users too.
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let lastX = null;
      let travelTimer = 0;
      const place = (idx) => {
        const btn = btns[idx];
        if (!btn || !btn.offsetWidth) { nav.style.setProperty("--pill-o", "0"); return; }
        const x = btn.offsetLeft;
        if (!reduceMotion && lastX !== null && Math.abs(x - lastX) > 4) {
          nav.classList.add("is-traveling");
          clearTimeout(travelTimer);
          travelTimer = setTimeout(() => nav.classList.remove("is-traveling"), 440);
        }
        lastX = x;
        nav.style.setProperty("--pill-x", x + "px");
        nav.style.setProperty("--pill-w", btn.offsetWidth + "px");
        nav.style.setProperty("--pill-h", btn.offsetHeight + "px");
        nav.style.setProperty("--pill-o", "1");
      };
      // Music-app press: holding a tab inflates the lens under the finger/cursor; release springs
      // it back (CSS handles the spring via --ease-liquid).
      nav.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button")) nav.classList.add("is-pressing");
      }, { passive: true });
      ["pointerup", "pointerleave", "pointercancel"].forEach((t) =>
        nav.addEventListener(t, () => nav.classList.remove("is-pressing"), { passive: true })
      );
      // Coalesced into a single rAF: several triggers can fire in the same tick (e.g. every
      // intersecting section reporting at once on load) — each `place()` reads layout
      // (offsetWidth/Left/Height) right after a previous call's style write, which would force a
      // synchronous layout recalc per call otherwise. One shared rAF collapses any same-tick burst
      // into a single read+write pair on the next frame.
      let raf = 0;
      const render = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => place(hoverIdx >= 0 ? hoverIdx : activeIdx));
      };
      const setActive = (idx) => {
        activeIdx = idx;
        btns.forEach((b, i) => b.classList.toggle("is-active", i === idx));
        if (hoverIdx < 0) render();
      };

      btns.forEach((btn, i) => {
        btn.addEventListener("mouseenter", () => { hoverIdx = i; render(); });
        btn.addEventListener("focus", () => { hoverIdx = i; render(); });
        btn.addEventListener("mouseleave", () => { hoverIdx = -1; render(); });
        btn.addEventListener("blur", () => { hoverIdx = -1; render(); });
      });

      // Scroll-spy: mark the section crossing the upper-middle band as active (reuses the
      // IntersectionObserver pattern from reveal.js). Modal items (no matching section) are skipped.
      const targets = ids
        .map((id, i) => { const el = document.getElementById(id); return el ? { el, i } : null; })
        .filter(Boolean);
      if ("IntersectionObserver" in window && targets.length) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (!e.isIntersecting) return;
              const t = targets.find((t) => t.el === e.target);
              if (t) setActive(t.i);
            });
          },
          { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
        );
        targets.forEach((t) => io.observe(t.el));
      }

      window.addEventListener("resize", render);

      setActive(0);
    },

    setupHeroContrast() {
      const hero = document.getElementById("home");
      const copy = hero?.querySelector(".hero__copy");
      const h1 = copy?.querySelector("h1");
      const img = document.getElementById("heroBaseImg");
      const backdrop = hero?.querySelector(".hero__backdrop");
      if (!hero || !copy || !h1 || !img || !backdrop) return;

      const update = () => {
        if (!img.complete || !img.naturalWidth) return;

        const h1Rect = h1.getBoundingClientRect();
        const backdropRect = backdrop.getBoundingClientRect();
        const sampleX = h1Rect.left + h1Rect.width * 0.5;
        const sampleY = h1Rect.top + h1Rect.height * 0.42;

        const overlapsBackdrop =
          sampleY < backdropRect.bottom &&
          sampleX > backdropRect.left &&
          sampleX < backdropRect.right;

        if (!overlapsBackdrop) {
          copy.classList.remove("hero__copy--on-dark");
          return;
        }

        const pos = getComputedStyle(img).objectPosition.trim().split(/\s+/);
        const objectPosX = (parseFloat(pos[0]) || 50) / 100;
        const objectPosY = (parseFloat(pos[1] || pos[0]) || 50) / 100;
        const bw = backdropRect.width;
        const bh = backdropRect.height;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const scale = Math.max(bw / iw, bh / ih);
        const sw = iw * scale;
        const sh = ih * scale;
        const imgLeft = backdropRect.left + (bw - sw) * objectPosX;
        const imgTop = backdropRect.top + (bh - sh) * objectPosY;
        const lx = (sampleX - imgLeft) / scale;
        const ly = (sampleY - imgTop) / scale;

        if (lx < 0 || ly < 0 || lx > iw || ly > ih) {
          copy.classList.remove("hero__copy--on-dark");
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, lx, ly, 1, 1, 0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        // Same Rec. 709 luma weights as data.js's _readableFg, but applied directly to the raw
        // sampled pixel (no gamma-linearization step — good enough for a quick per-frame heuristic,
        // where _readableFg computes a one-time AA-contrast decision for a hex color). Threshold is
        // tuned above the standard 0.5 midpoint — 0.58 — because the hero text also carries its own
        // drop-shadow, which reads as legible "on-dark" slightly earlier than raw luminance suggests.
        const lum = (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
        const onDark = lum < HERO_ON_DARK_LUM;
        copy.classList.toggle("hero__copy--on-dark", onDark);
      };

      // rAF-coalesced: `update()` forces a canvas pixel readback (drawImage + getImageData), the
      // most expensive line in this function — resize-drag storms must not run it once per event.
      let raf = 0;
      const scheduleUpdate = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(update);
      };

      img.addEventListener("load", update);
      if (img.complete) update();
      window.addEventListener("resize", scheduleUpdate);
      window.addEventListener("portfolio-ready", () => {
        requestAnimationFrame(update);
        setTimeout(update, T.HERO_SETTLE);
      });
    },

    tickClock() {
      const now = new Date();
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, "0");
      const mer = h < 12 ? "am" : "pm";
      h = h % 12 || 12;
      this.clockTime = h + ":" + m + mer;
      const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      this.clockDate = now.getDate() + " " + months[now.getMonth()] + ", " + now.getFullYear();

      // Analog hour/minute hands: set directly each tick (they barely move between ticks, and ease
      // via CSS transition). clockAngleS only matters as the reduced-motion static fallback below —
      // the live second hand is driven purely by CSS (see initClockSweep), never touched per tick,
      // so its 60s linear sweep has zero JS-driven jumps and is genuinely seamless.
      const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
      const minutes = now.getMinutes() + seconds / 60;
      const hours12 = (now.getHours() % 12) + minutes / 60;
      this.clockAngleH = hours12 * 30;
      this.clockAngleM = minutes * 6;
      this.clockAngleS = seconds * 6;
    },

    // Sets the second hand's CSS animation-delay exactly once, from the real time at load, so its
    // 60s linear-infinite sweep is phase-correct from the start — then never touches it again.
    initClockSweep() {
      const now = new Date();
      const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
      this.clockSecondDelay = "-" + seconds.toFixed(3) + "s";
    },

    // Locking via plain `overflow: hidden` on <html>/<body> silently resets scrollTop to 0 in
    // Chromium the instant it's applied (confirmed via direct scrollY inspection, not assumed) —
    // that's what made opening the modal or the menu snap the whole page to the top, with no way
    // back since the position was never captured. The standard fix: pin the body at its current
    // visual position with `position: fixed` + a negative `top` offset (this does NOT reset scroll
    // like toggling overflow does), then explicitly restore the real scroll position on unlock —
    // removing position:fixed alone leaves the page at 0, it doesn't "remember" where it was.
    // Critical ordering: scrollY MUST be captured before the scroll-lock classes go on, not after —
    // adding overflow:hidden is exactly what zeroes it, so reading it any later just captures 0
    // (an actual bug caught here mid-fix, not a hypothetical: the first version of this same code
    // read window.scrollY after the classList calls and always stored 0).
    // Guarded against redundant calls: navGo() unconditionally calls closeMenu() even when the menu
    // was never open (a plain nav-link click), which used to be a harmless no-op back when this
    // only toggled a CSS class. Now that "unlock" also restores scroll position, an unguarded
    // scrollLock(false) here would schedule a scrollTo(0, 0) that can race with and clobber the very
    // section-scroll navGo() fires right after — caught via a real click test (Skills nav link
    // silently failing to scroll), not spotted by inspection alone.
    scrollLock(on) {
      if (on === !!this._scrollLocked) return;
      this._scrollLocked = on;
      const y = on ? window.scrollY : this._lockedScrollY || 0;
      const fn = on ? "add" : "remove";
      document.documentElement.classList[fn]("scroll-lock");
      document.body.classList[fn]("scroll-lock");
      if (on) {
        this._lockedScrollY = y;
        document.body.style.top = -y + "px";
      } else {
        document.body.style.top = "";
        // Reading a layout property forces a synchronous reflow, so the browser recomputes the
        // document's scrollable height right here instead of on its own schedule — without this,
        // scrollTo below reads stale (pre-reflow) layout and silently clamps to 0 (confirmed by
        // direct inspection). This has to be synchronous, not deferred to the next frame/rAF: when
        // navGo() closes the menu and opens the modal 60ms later, an rAF-deferred restore may not
        // have fired yet by the time the modal re-locks and captures window.scrollY — caught via a
        // real click-through test (menu → Contact → modal captured 0 instead of the real position),
        // not spotted by inspection alone. Forcing the reflow inline removes the race entirely.
        document.body.offsetHeight;
        // Explicit behavior:"instant" is required — the legacy 2-arg scrollTo(0, y) form is governed
        // by html's own `scroll-behavior: smooth` (confirmed via direct inspection: without this, the
        // restore visibly animates from 0 up to the real position over several hundred ms instead of
        // snapping back, reading as "the page scrolled to top, then scrolled back" even though the
        // internal scrollY value was always correct at every sampled instant).
        window.scrollTo({ top: y, left: 0, behavior: "instant" });
      }
    },

    scrollTo(id) {
      const el = document.getElementById(id);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - 12;
      this._liquidWarp();
      window.scrollTo({ top: y, behavior: "smooth" });
    },

    scrollToTop() {
      this._liquidWarp();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    // Brief "liquid glass" blur/refraction pulse across the scrolling content while a nav-triggered
    // smooth scroll is in flight — purely filter/transform (compositor-only). Scoped to #main, not
    // the whole app: blurring the fixed site-header along with the page beneath it read as the
    // header itself "disappearing" mid-scroll, since it's the one thing on screen that never moves.
    // Cleared on the native `scrollend` event where supported, with a timeout fallback (Safari/short
    // scrolls that never fire it) so it can never get stuck on.
    _liquidWarp() {
      const root = document.getElementById("main");
      if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      root.classList.add("is-liquid-warp");
      clearTimeout(this._warpTimer);
      const done = () => {
        root.classList.remove("is-liquid-warp");
        window.removeEventListener("scrollend", done);
      };
      window.addEventListener("scrollend", done, { once: true });
      this._warpTimer = setTimeout(done, T.LIQUID_WARP);
    },

    navGo(item) {
      // The modal branch deliberately does NOT go through closeMenu()+openModal() (each of which
      // calls scrollLock) — both the menu and the modal want scroll locked, so unlocking and
      // immediately re-locking 60ms later just to hand off between them creates a race where the
      // re-lock can capture scrollY before the unlock's restore has actually landed (caught via a
      // real click-through test: menu → Contact → modal captured position 0 instead of the real
      // one). Keeping the lock continuously active through the handoff removes the race outright
      // instead of trying to make it resolve fast enough.
      if (item.action === "modal") {
        this.menuOpen = false;
        setTimeout(() => {
          this.modalOpen = true;
          this.success = false;
          this.submitting = false;
          this.formError = "";
        }, T.MENU_HANDOFF);
        this._loadTurnstile();
        return;
      }
      this.closeMenu();
      setTimeout(() => this.scrollTo(item.id), T.NAV_SCROLL);
    },

    openMenu() {
      this.menuOpen = true;
      this.scrollLock(true);
      // Lay the overlay's Close button exactly over the header's Menu button so the drawer reads as
      // the same control morphing in place. The Menu button's on-screen position isn't a fixed
      // constant (the glass-pill's height — and thus the vertically-centred button's top — shifts
      // between breakpoints), so mirror its live rect rather than hard-coding offsets. nextTick +
      // rAF lets the overlay lay out first. A one-time resize hook keeps it aligned if the viewport
      // changes while open.
      requestAnimationFrame(() => requestAnimationFrame(() => this.syncCloseBtn()));
      if (!this._closeSync) {
        this._closeSync = () => { if (this.menuOpen) this.syncCloseBtn(); };
        window.addEventListener("resize", this._closeSync, { passive: true });
      }
    },
    closeMenu() { this.menuOpen = false; this.scrollLock(false); },
    syncCloseBtn() {
      // document.querySelector (not this.$el): this runs from a detached rAF callback where Alpine's
      // $el magic isn't in scope and resolves undefined. Both elements are unique on the page.
      const menu = document.querySelector(".site-header .menu-btn");
      const close = document.querySelector(".nav-overlay__close");
      if (!menu || !close) return;
      const r = menu.getBoundingClientRect();
      if (!r.width) return;
      Object.assign(close.style, {
        position: "fixed",
        top: r.top + "px",
        left: r.left + "px",
        width: r.width + "px",
        height: r.height + "px",
        margin: "0",
      });
    },

    openModal() {
      this.modalOpen = true;
      this.success = false;
      this.submitting = false;
      this.formError = "";
      this.scrollLock(true);
      this._loadTurnstile();
    },
    closeModal() {
      this.modalOpen = false;
      this.scrollLock(false);
      setTimeout(() => { this.submitting = false; this.success = false; this.formError = ""; }, T.MODAL_RESET);
    },

    // Lazy-load the Turnstile widget script only when the contact modal opens — keeps the external
    // request (and its bytes) off the initial page load, so PageSpeed is unaffected. No-ops when no
    // site key is configured (the form still works; the Worker only enforces the CAPTCHA when its
    // secret is set), and only injects the script once.
    _loadTurnstile() {
      const key = this.site && this.site.turnstileSiteKey;
      if (!key || window.turnstile || this._tsLoading) return;
      this._tsLoading = true;
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    },

    // Real submit: POST the form to the Worker (/api/contact). The Worker validates, verifies
    // Turnstile, logs + persists the submission, and emails a notification. On any failure we surface
    // a fallback message instead of a fake success.
    async submitForm(e) {
      e.preventDefault();
      if (this.submitting) return;
      const form = e.target;
      this.submitting = true;
      this.formError = "";
      const fd = new FormData(form);
      const payload = {
        name: fd.get("name") || "",
        email: fd.get("email") || "",
        project: fd.get("project") || "",
        token: fd.get("cf-turnstile-response") || "",
      };
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        this.success = true;
        form.reset();
        if (window.turnstile) { try { window.turnstile.reset(); } catch (_) { /* widget not rendered */ } }
      } catch (_) {
        this.formError =
          (this.site && this.site.contactModal && this.site.contactModal.errorNote) ||
          "Couldn't send — please try again.";
      } finally {
        this.submitting = false;
      }
    },

    tintVars(tint) {
      // primary/blue deliberately resolve to violet/blue (not --primary/--teal themselves, which
      // are each used 10-20+ times elsewhere) — the azure/sea-teal pair sits only 12° apart on the
      // hue wheel and read as near-identical pale-blue badges; violet/blue are well separated from
      // copper and each other.
      // --tint-ink used to be each hue's *darkened* form (--accent-dark #97501f, a literal brown;
      // #146b29, a muddy forest green) — fine for small text-sized accents, but blown up to the
      // hero-card icon's own scale it read as a flat "copper and beige" wash rather than a real
      // color. Switched to each hue's own bright/base tone instead (still enough contrast against
      // the pale hero photo, now backed by a real drop-shadow for separation).
      // The "Lately" card was --c-green (#30d158) — a light, low-saturation green that read as
      // barely-there against this card's own pale surface (confirmed low contrast, not just a
      // hunch). --c-blue (#0a84ff) is a genuinely distinct, higher-contrast hue from both copper
      // and violet, and reads better against light backgrounds generally.
      const map = {
        accent: { tint: "var(--accent)", ink: "var(--accent-bright)" },
        primary: { tint: "var(--c-violet)", ink: "var(--c-violet)" },
        blue: { tint: "var(--c-blue)", ink: "var(--c-blue)" },
      };
      const v = map[tint] || map.accent;
      return "--tint:" + v.tint + ";--tint-ink:" + v.ink;
    },

    // Direction-aware content swap: slide+fade the OLD caption/title out, swap the underlying data
    // while it's invisible, then slide+fade the NEW content in from the opposite side. Uses CSS
    // transitions (not @keyframes) throughout so rapid re-clicking retargets smoothly instead of
    // restarting from zero — mirrors _liquidWarp()'s transitionend+timeout-fallback cleanup and
    // reveal.js's double-rAF class-add idiom (both already established elsewhere in this file).
    cardStep(dir) {
      const n = this.heroCards.length;
      const next = (this.cardIndex + dir + n) % n;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        this.cardIndex = next;
        return;
      }

      const wrap = this._swapEl || (this._swapEl = document.querySelector(".hero-card__swap"));
      if (!wrap) { this.cardIndex = next; return; }

      const dir_ = dir > 0 ? "next" : "prev";
      clearTimeout(this._swapTimer);
      wrap.removeEventListener("transitionend", this._onSwapExitEnd);

      // Exit: slide+fade the CURRENT content out toward dir_. A forced reflow (offsetWidth read)
      // between remove/add lets rapid re-clicks retarget the transition instead of no-op'ing on an
      // unchanged class. Also clear any is-swap-instant/is-entering-* left behind by an interrupted
      // _finishSwap() (its own cleanup runs on the next double-rAF, which a fast-enough repeat click
      // can pre-empt) — is-swap-instant sets transition:none, so leaving it on would silently disable
      // the very transition this call is about to trigger.
      wrap.classList.remove("is-swapping-next", "is-swapping-prev", "is-swap-instant", "is-entering-next", "is-entering-prev");
      void wrap.offsetWidth;
      wrap.classList.add("is-swapping-" + dir_);
      const badgeIcon = this._badgeIconEl || (this._badgeIconEl = document.querySelector(".hero-card__badge-icon"));
      if (badgeIcon) badgeIcon.classList.remove("is-pulsing"); // same defensive clear as above, cheap insurance

      this._onSwapExitEnd = (e) => {
        if (e.target !== wrap || e.propertyName !== "opacity") return;
        wrap.removeEventListener("transitionend", this._onSwapExitEnd);
        this._finishSwap(wrap, next, dir_);
      };
      wrap.addEventListener("transitionend", this._onSwapExitEnd);
      this._swapTimer = setTimeout(() => this._finishSwap(wrap, next, dir_), T.CARD_SWAP);
    },

    _finishSwap(wrap, next, dir_) {
      clearTimeout(this._swapTimer);
      this.cardIndex = next; // content updates now, while fully transparent/off-axis — invisible swap
      const badgeIcon = this._badgeIconEl || (this._badgeIconEl = document.querySelector(".hero-card__badge-icon"));
      wrap.classList.add("is-swap-instant"); // transitions off for one frame — reposition is a silent jump
      wrap.classList.remove("is-swapping-next", "is-swapping-prev");
      wrap.classList.add("is-entering-" + dir_);
      if (badgeIcon) badgeIcon.classList.add("is-pulsing"); // brief Dynamic-Island-style content-ack pulse
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { // double-rAF: same idiom as reveal.js's is-visible add
          wrap.classList.remove("is-swap-instant", "is-entering-" + dir_); // now animates back to rest
          if (badgeIcon) badgeIcon.classList.remove("is-pulsing");
        });
      });
    },

    activeCard() { return this.heroCards[this.cardIndex]; },

    brandOf(name) { return window.PORTFOLIO_DATA.brandOf(name); },

    tenureOf(period) { return window.PORTFOLIO_DATA.tenureOf(period); },

    eduTenureOf(e) { return window.PORTFOLIO_DATA.eduTenureOf(e); },

    companyTenureOf(roles) { return window.PORTFOLIO_DATA.companyTenureOf(roles); },

    highlightExp(text) { return window.PORTFOLIO_DATA.highlightExp(text); },

    iconSvg(name, className) { return window.iconSvg(name, className); },

    /** Named "under construction" feature flag lookup, e.g. uc('contactForm').
     *  Config lives in portfolio.json → site.features.underConstruction.<key>. Returns a safe
     *  object ({ enabled:false }) when the key is absent, so any section can be gated by name. */
    uc(key) {
      const map = (this.site && this.site.features && this.site.features.underConstruction) || {};
      return map[key] || { enabled: false };
    },

    roleEmployment(role) {
      if (role?.employment?.label) return role.employment;
      const live = window.PORTFOLIO_DATA;
      const normalized = live?.normalizeRole ? live.normalizeRole(role) : role;
      return normalized?.employment || { type: "permanent", label: "Permanent", icon: "permanent" };
    },

    // Shared open/close height-transition driver — used by toggleRole() below for both directions.
    // transitionend + a setTimeout fallback (same idiom as _liquidWarp) guarantees `onDone` always
    // fires even if the panel is hidden or the transition is otherwise interrupted before it can
    // complete naturally; without the fallback, a missed event would leave the panel's inline
    // height/overflow/transition styles stuck instead of cleared. Timer/listener are stashed
    // directly on the element so concurrent panels (different accordion rows) never share state.
    _animateHeight(panel, toHeight, durationMs, onDone, easing) {
      clearTimeout(panel._heightTimer);
      panel.removeEventListener("transitionend", panel._heightOnEnd);

      // Promote the inner content to its own compositor layer for the duration of the height
      // animation: it gets rasterized once, then the panel's animating overflow:hidden just clips
      // that cached layer each frame instead of repainting the (now glossy) stack coins + detail
      // list every frame — the height-driven repaint was the Safari jank on the Experience expand.
      // The layer is released on finish so nothing lingers. Safe here: no popovers live inside inner
      // (they sit in the exp-row header), so the new stacking context can't clip a tooltip.
      const inner = panel.querySelector(".exp-details__inner");

      const finish = () => {
        clearTimeout(panel._heightTimer);
        panel.removeEventListener("transitionend", panel._heightOnEnd);
        if (inner) { inner.style.willChange = ""; inner.style.transform = ""; }
        onDone();
      };
      panel._heightOnEnd = (e) => { if (e.propertyName === "height") finish(); };
      panel.addEventListener("transitionend", panel._heightOnEnd);
      panel._heightTimer = setTimeout(finish, durationMs + 80);

      requestAnimationFrame(() => {
        // translateZ(0), not just will-change: Safari treats will-change as a hint and often skips
        // the cached layer, so the glossy content repaints every frame as the clip grows. An explicit
        // 3D transform forces a real compositor layer — content rasterized once, then only clipped.
        if (inner) { inner.style.willChange = "transform"; inner.style.transform = "translateZ(0)"; }
        panel.style.transition = "height " + durationMs + "ms " + (easing || "cubic-bezier(0.32, 0.72, 0, 1)");
        panel.style.height = toHeight;
      });
    },

    toggleRole(id) {
      const opening = !this.openRoles[id];
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        this.openRoles[id] = opening;
        return;
      }

      const panel = document.getElementById("exp-panel-" + id);
      const inner = panel?.querySelector(".exp-details__inner");
      if (!panel || !inner) {
        this.openRoles[id] = opening;
        return;
      }

      const finish = () => {
        panel.style.height = "";
        panel.style.overflow = "";
        panel.style.transition = "";
      };

      if (opening) {
        this.openRoles[id] = true;
        // First open of this role: the x-if-gated content (details list + stack/AI-tool pills, see
        // hasOpenedOnce()) isn't mounted yet. Setting openedRoles here and waiting a *second*
        // $nextTick lets Alpine actually mount that template before scrollHeight is read below —
        // otherwise the very first expand would animate to the pre-content (too-short) height.
        // Every subsequent open of the same role skips straight through (already mounted, already
        // true) so the animation is unaffected once past first-open.
        const firstOpen = !this.openedRoles[id];
        if (firstOpen) this.openedRoles[id] = true;
        this.$nextTick(() => {
          const mountReady = firstOpen ? new Promise((r) => this.$nextTick(r)) : Promise.resolve();
          mountReady.then(() => {
            panel.style.overflow = "hidden";
            panel.style.height = "0px";
            // Overshoot on open only (skiper103 "bouncy accordion" read) — a back-out curve with
            // y>1 makes `height` genuinely stretch a few % past scrollHeight then settle, a real
            // spring bounce. Close stays on the flat decel curve (default) — bouncing right before
            // fully collapsing would read as a glitch, not a spring.
            this._animateHeight(panel, inner.scrollHeight + "px", T.ROLE_OPEN, finish, "cubic-bezier(0.34, 1.56, 0.64, 1)");
          });
        });
        return;
      }

      panel.style.overflow = "hidden";
      panel.style.height = panel.scrollHeight + "px";
      this._animateHeight(panel, "0px", T.ROLE_CLOSE, () => {
        this.openRoles[id] = false;
        finish();
      });
    },

    isRoleOpen(id) { return !!this.openRoles[id]; },
    hasOpenedOnce(id) { return !!this.openedRoles[id]; },

    roleToggleLabel(id) {
      return this.isRoleOpen(id) ? "Hide details" : "View details";
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("portfolioApp", portfolioApp);
});
window.portfolioApp = portfolioApp;

// Touch popover + partner-orb — must live here (not motion.js) so reduced-motion still gets
// tap-toggle + dismissal. Fine-pointer devices keep CSS :hover / :focus-within.
(function setupTouchReveal() {
  const touch =
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(hover: none)").matches;
  if (!touch) return;

  let openPopover = null;
  let openOrb = null;

  function closePopover() {
    if (!openPopover) return;
    openPopover.classList.remove("is-open");
    openPopover = null;
  }
  function closeOrb() {
    if (!openOrb) return;
    openOrb.classList.remove("is-open");
    openOrb = null;
  }
  function dismissAll() {
    closePopover();
    closeOrb();
  }

  document.addEventListener("click", (e) => {
    const orb = e.target.closest && e.target.closest(".partner-orb");
    if (orb) {
      if (openOrb === orb) {
        closeOrb();
        return; // second tap — allow navigation
      }
      e.preventDefault();
      closePopover();
      if (openOrb) openOrb.classList.remove("is-open");
      openOrb = orb;
      orb.classList.add("is-open");
      return;
    }

    const pop = e.target.closest && e.target.closest(".popover");
    if (pop) {
      e.preventDefault();
      e.stopPropagation();
      closeOrb();
      if (openPopover === pop) {
        closePopover();
      } else {
        if (openPopover) openPopover.classList.remove("is-open");
        openPopover = pop;
        pop.classList.add("is-open");
      }
      return;
    }
  });

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!openPopover && !openOrb) return;
      const t = e.target;
      if (openPopover && openPopover.contains(t)) return;
      if (openOrb && openOrb.contains(t)) return;
      dismissAll();
    },
    true
  );

  window.addEventListener("scroll", dismissAll, { passive: true });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dismissAll();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") dismissAll();
  });
})();
