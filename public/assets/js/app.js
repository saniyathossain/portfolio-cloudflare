/** Alpine.js portfolio app — nav, modal, clock, carousel, experience toggles */
function portfolioApp() {
  const D = window.PORTFOLIO_DATA || {};
  const sections = D.sections || {
    services: "Backend, architecture, APIs, and AI-assisted delivery.",
    experience: "14+ years · 8 roles across 5 companies.",
    skills: "Languages, frameworks, data, platform, and AI in the flow.",
    education: "Electronics & Telecommunication Engineering — Dhaka.",
  };
  return {
    menuOpen: false,
    modalOpen: false,
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
      setInterval(() => this.tickClock(), 1000);
      this.setupHeroGlow();
      this.setupHeroContrast();
      this.$nextTick(() => this.setupNavPill());
      this._onKey = (e) => {
        if (e.key === "Escape") {
          if (this.modalOpen) this.closeModal();
          else if (this.menuOpen) this.closeMenu();
        }
      };
      window.addEventListener("keydown", this._onKey);
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
        const onDark = lum < 0.58;
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
        setTimeout(update, 120);
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

    scrollLock(on) {
      const fn = on ? "add" : "remove";
      document.documentElement.classList[fn]("scroll-lock");
      document.body.classList[fn]("scroll-lock");
    },

    scrollTo(id) {
      const el = document.getElementById(id);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - 12;
      this._liquidWarp();
      window.scrollTo({ top: y, behavior: "smooth" });
    },

    // Brief "liquid glass" blur/refraction pulse across the whole app while a nav-triggered smooth
    // scroll is in flight — purely filter/transform (compositor-only). Cleared on the native
    // `scrollend` event where supported, with a timeout fallback (Safari/short scrolls that never
    // fire it) so it can never get stuck on.
    _liquidWarp() {
      const root = document.getElementById("app");
      if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      root.classList.add("is-liquid-warp");
      clearTimeout(this._warpTimer);
      const done = () => {
        root.classList.remove("is-liquid-warp");
        window.removeEventListener("scrollend", done);
      };
      window.addEventListener("scrollend", done, { once: true });
      this._warpTimer = setTimeout(done, 700);
    },

    navGo(item) {
      this.closeMenu();
      if (item.action === "modal") setTimeout(() => this.openModal(), 60);
      else setTimeout(() => this.scrollTo(item.id), 80);
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
      setTimeout(() => { this.submitting = false; this.success = false; }, 300);
    },

    submitForm(e) {
      e.preventDefault();
      this.submitting = true;
      setTimeout(() => { this.submitting = false; this.success = true; }, 900);
    },

    tintVars(tint) {
      // primary/teal deliberately resolve to violet/green (not --primary/--teal themselves, which
      // are each used 10-20+ times elsewhere) — the azure/sea-teal pair sits only 12° apart on the
      // hue wheel and read as near-identical pale-blue badges; violet/green are 106°+ from copper
      // and each other.
      const map = {
        accent: { tint: "var(--accent)", ink: "var(--accent-dark)" },
        primary: { tint: "var(--c-violet)", ink: "#4a48a8" },
        teal: { tint: "var(--c-green)", ink: "#146b29" },
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
      this._swapTimer = setTimeout(() => this._finishSwap(wrap, next, dir_), 240);
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

    companyTenureOf(roles) { return window.PORTFOLIO_DATA.companyTenureOf(roles); },

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

      const finish = () => {
        clearTimeout(panel._heightTimer);
        panel.removeEventListener("transitionend", panel._heightOnEnd);
        onDone();
      };
      panel._heightOnEnd = (e) => { if (e.propertyName === "height") finish(); };
      panel.addEventListener("transitionend", panel._heightOnEnd);
      panel._heightTimer = setTimeout(finish, durationMs + 80);

      requestAnimationFrame(() => {
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
          this._animateHeight(panel, inner.scrollHeight + "px", 420, finish);
        });
        return;
      }

      panel.style.overflow = "hidden";
      panel.style.height = panel.scrollHeight + "px";
      this._animateHeight(panel, "0px", 300, () => {
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
