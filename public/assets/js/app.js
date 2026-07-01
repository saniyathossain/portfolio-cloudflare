/** Alpine.js portfolio app — nav, modal, clock, carousel, experience toggles */
function portfolioApp() {
  const D = window.PORTFOLIO_DATA;
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

    init() {
      this.tickClock();
      setInterval(() => this.tickClock(), 1000);
      this.setupHeroGlow();
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
      const y = el.getBoundingClientRect().top + window.pageYOffset - 12;
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

    iconSrc(name) { return window.iconSrc(name); },

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
            panel.style.transition = "height 0.2s cubic-bezier(0.22, 1, 0.36, 1)";
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
        panel.style.transition = "height 0.16s cubic-bezier(0.4, 0, 0.2, 1)";
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
