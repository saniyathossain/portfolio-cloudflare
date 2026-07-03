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
      setInterval(() => this.tickClock(), 1000);
      this.setupHeroGlow();
      this.setupHeroContrast();
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
        const lum = (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
        const onDark = lum < 0.58;
        copy.classList.toggle("hero__copy--on-dark", onDark);
      };

      img.addEventListener("load", update);
      if (img.complete) update();
      window.addEventListener("resize", update);
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
      window.scrollTo({ top: y, behavior: "smooth" });
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

    cardStep(dir) {
      const n = this.heroCards.length;
      this.cardIndex = (this.cardIndex + dir + n) % n;
    },

    activeCard() { return this.heroCards[this.cardIndex]; },

    brandOf(name) { return window.PORTFOLIO_DATA.brandOf(name); },

    tenureOf(period) { return window.PORTFOLIO_DATA.tenureOf(period); },

    companyTenureOf(roles) { return window.PORTFOLIO_DATA.companyTenureOf(roles); },

    iconSrc(name) { return window.iconSrc(name); },
    iconSvg(name, className) { return window.iconSvg(name, className); },

    roleEmployment(role) {
      if (role?.employment?.label) return role.employment;
      const live = window.PORTFOLIO_DATA;
      const normalized = live?.normalizeRole ? live.normalizeRole(role) : role;
      return normalized?.employment || { type: "permanent", label: "Permanent", icon: "permanent" };
    },

    toggleRole(id) {
      const opening = !this.openRoles[id];
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        this.openRoles[id] = opening;
        return;
      }

      const panel = document.getElementById("exp-panel-" + id);
      if (!panel) {
        this.openRoles[id] = opening;
        return;
      }
      const inner = panel.querySelector(".exp-details__inner");
      if (!inner) {
        this.openRoles[id] = opening;
        return;
      }

      const finish = (el) => {
        el.style.height = "";
        el.style.overflow = "";
        el.style.transition = "";
      };

      if (opening) {
        this.openRoles[id] = true;
        this.$nextTick(() => {
          panel.style.overflow = "hidden";
          panel.style.height = "0px";
          requestAnimationFrame(() => {
            panel.style.transition = "height 0.42s cubic-bezier(0.32, 0.72, 0, 1)";
            panel.style.height = inner.scrollHeight + "px";
          });
          const onEnd = (e) => {
            if (e.propertyName !== "height") return;
            finish(panel);
            panel.removeEventListener("transitionend", onEnd);
          };
          panel.addEventListener("transitionend", onEnd);
        });
        return;
      }

      panel.style.overflow = "hidden";
      panel.style.height = panel.scrollHeight + "px";
      requestAnimationFrame(() => {
        panel.style.transition = "height 0.3s cubic-bezier(0.32, 0.72, 0, 1)";
        panel.style.height = "0px";
      });
      const onEnd = (e) => {
        if (e.propertyName !== "height") return;
        this.openRoles[id] = false;
        finish(panel);
        panel.removeEventListener("transitionend", onEnd);
      };
      panel.addEventListener("transitionend", onEnd);
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
