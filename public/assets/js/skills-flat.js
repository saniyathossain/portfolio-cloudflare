/**
 * Tools & craft flat strip — mobile "View more" accordion + height driver for pill reflow.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */

const SKILLS_FLAT_T = { OPEN: 420, CLOSE: 300 };
const SKILLS_FLAT_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

function skillsFlatAnimateHeight(panel, toHeight, durationMs, onDone, easing) {
  clearTimeout(panel._heightTimer);
  panel.removeEventListener("transitionend", panel._heightOnEnd);
  const inner = panel.querySelector(".skills-flat__inner");

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
    if (inner) { inner.style.willChange = "transform"; inner.style.transform = "translateZ(0)"; }
    panel.style.transition = "height " + durationMs + "ms " + (easing || SKILLS_FLAT_EASE);
    panel.style.height = toHeight;
  });
}

function skillsFlatPanel() {
  return {
    skillsFlatOpen: false,
    skillsFlatMobile: false,

    init() {
      this._mq = window.matchMedia("(max-width: 639px)");
      const sync = () => {
        this.skillsFlatMobile = this._mq.matches;
        this.$nextTick(() => this.syncFlatPanelHeight());
      };
      sync();
      this._mq.addEventListener("change", sync);
    },

    syncFlatPanelHeight() {
      const panel = document.getElementById("skills-flat-panel");
      const inner = panel?.querySelector(".skills-flat__inner");
      if (!panel || !inner) return;
      if (!this.skillsFlatMobile) {
        panel.style.height = "";
        panel.style.overflow = "";
        panel.style.transition = "";
        return;
      }
      panel.style.overflow = "hidden";
      panel.style.height = inner.scrollHeight + "px";
      panel.style.transition = "";
    },

    flatSkillItems() {
      const out = [];
      const skills = window.PORTFOLIO_DATA?.skills || [];
      skills.forEach((g) => {
        (g.items || []).forEach((item) => out.push({ item, group: g.title }));
      });
      return out;
    },

    skillsFlatLimit() { return 12; },

    skillsFlatMoreCount() {
      if (!this.skillsFlatMobile) return 0;
      return Math.max(0, this.flatSkillItems().length - this.skillsFlatLimit());
    },

    showFlatSkill(i) {
      if (!this.skillsFlatMobile || this.skillsFlatOpen) return true;
      return i < this.skillsFlatLimit();
    },

    skillsFlatToggleLabel() {
      return this.skillsFlatOpen ? "View less" : "View more";
    },

    brandOf(name) {
      return window.PORTFOLIO_DATA?.brandOf?.(name)
        || { color: "#6b6b6b", src: null, mono: "?" };
    },

    iconSvg(name, cls) {
      if (this.$parent && typeof this.$parent.iconSvg === "function") {
        return this.$parent.iconSvg(name, cls);
      }
      return "";
    },

    toggleSkillsFlat() {
      const opening = !this.skillsFlatOpen;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        this.skillsFlatOpen = opening;
        return;
      }

      const panel = document.getElementById("skills-flat-panel");
      const inner = panel?.querySelector(".skills-flat__inner");
      if (!panel || !inner) {
        this.skillsFlatOpen = opening;
        return;
      }

      const finish = () => {
        panel.style.height = inner.scrollHeight + "px";
        panel.style.overflow = "hidden";
        panel.style.transition = "";
      };

      if (opening) {
        this.skillsFlatOpen = true;
        this.$nextTick(() => {
          panel.style.overflow = "hidden";
          panel.style.height = panel.offsetHeight + "px";
          skillsFlatAnimateHeight(panel, inner.scrollHeight + "px", SKILLS_FLAT_T.OPEN, finish);
        });
        return;
      }

      panel.style.overflow = "hidden";
      panel.style.height = panel.scrollHeight + "px";
      this.skillsFlatOpen = false;
      this.$nextTick(() => {
        skillsFlatAnimateHeight(panel, inner.scrollHeight + "px", SKILLS_FLAT_T.CLOSE, finish);
      });
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("skillsFlatPanel", skillsFlatPanel);
});
