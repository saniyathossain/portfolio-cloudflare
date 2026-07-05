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
    submitting: false,
    success: false,
    cardIndex: 0,
    clockTime: "9:41am",
    clockDate: "12 March, 2025",
    clockAngleH: 0,
    clockAngleM: 0,
    clockAngleS: 0,
    clockSecondDelay: "0s",
    openRoles: {},
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
    },

    // rAF-coalesced like reveal.js's scroll-progress bar — one threshold check per frame, not one
    // per scroll event, so a fast wheel-fling can't flood Alpine's reactivity with redundant writes.
    setupBackToTop() {
      let raf = 0;
      const check = () => {
        raf = 0;
        this.showBackToTop = window.scrollY > T.BACK_TO_TOP_PX;
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

      const place = (idx) => {
        const btn = btns[idx];
        if (!btn || !btn.offsetWidth) { nav.style.setProperty("--pill-o", "0"); return; }
        nav.style.setProperty("--pill-x", btn.offsetLeft + "px");
        nav.style.setProperty("--pill-w", btn.offsetWidth + "px");
        nav.style.setProperty("--pill-h", btn.offsetHeight + "px");
        nav.style.setProperty("--pill-o", "1");
      };
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
        }, T.MENU_HANDOFF);
        return;
      }
      this.closeMenu();
      setTimeout(() => this.scrollTo(item.id), T.NAV_SCROLL);
    },

    openMenu() { this.menuOpen = true; this.scrollLock(true); },
    closeMenu() { this.menuOpen = false; this.scrollLock(false); },

    openModal() {
      this.modalOpen = true;
      this.success = false;
      this.submitting = false;
      this.scrollLock(true);
    },
    closeModal() {
      this.modalOpen = false;
      this.scrollLock(false);
      setTimeout(() => { this.submitting = false; this.success = false; }, T.MODAL_RESET);
    },

    submitForm(e) {
      e.preventDefault();
      this.submitting = true;
      setTimeout(() => { this.submitting = false; this.success = true; }, T.FORM_SUBMIT);
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
    _animateHeight(panel, toHeight, durationMs, onDone) {
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
        if (inner) inner.style.willChange = "";
        onDone();
      };
      panel._heightOnEnd = (e) => { if (e.propertyName === "height") finish(); };
      panel.addEventListener("transitionend", panel._heightOnEnd);
      panel._heightTimer = setTimeout(finish, durationMs + 80);

      requestAnimationFrame(() => {
        if (inner) inner.style.willChange = "transform";
        panel.style.transition = "height " + durationMs + "ms cubic-bezier(0.32, 0.72, 0, 1)";
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
        this.$nextTick(() => {
          panel.style.overflow = "hidden";
          panel.style.height = "0px";
          this._animateHeight(panel, inner.scrollHeight + "px", T.ROLE_OPEN, finish);
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

    roleToggleLabel(id) {
      return this.isRoleOpen(id) ? "Hide details" : "View details";
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("portfolioApp", portfolioApp);
});
window.portfolioApp = portfolioApp;
