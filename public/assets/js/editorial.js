/**
 * Editorial section — floating dock filter + article list with filter-change motion.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */

const EDITORIAL_T = { SWITCH: 440, LENS_TRAVEL: 440, EXIT: 200, ENTER: 520 };

function editorialReadEase() {
  return getComputedStyle(document.documentElement).getPropertyValue("--ease-pill-flip").trim()
    || "cubic-bezier(0.23, 0.84, 0.35, 1)";
}

function editorialReadReflowMs() {
  const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dur-pill-panel-reflow"));
  return Number.isFinite(n) ? Math.round(n * 1000) : EDITORIAL_T.SWITCH;
}

function editorialAnimateHeight(panel, toHeight, durationMs, onDone) {
  clearTimeout(panel._heightTimer);
  panel.removeEventListener("transitionend", panel._heightOnEnd);
  const inner = panel.querySelector(".editorial-list");

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
    panel.style.transition = "height " + durationMs + "ms " + editorialReadEase();
    panel.style.height = toHeight;
  });
}

function editorialHelpers() {
  return {
    articleFilter: "all",
    articleQuery: "",
    searchMode: false,
    searchFocused: false,
    filterAnim: "",
    listGen: 0,

    init() {
      this.$nextTick(() => {
        this.syncTabLens();
        this.bindTabLens();
      });
    },

    matchesSearch(article) {
      const q = String(this.articleQuery || "").trim().toLowerCase();
      if (!q) return true;
      const hay = [
        article.title,
        article.excerpt,
        article.platform,
        ...(article.tags || []),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    },

    platformFilteredArticles() {
      const all = this.activeArticles();
      if (this.articleFilter === "all") return all;
      if (this.articleFilter === "dev.to") {
        return all.filter((a) => String(a.platform || "").toLowerCase().includes("dev"));
      }
      return all.filter((a) => String(a.platform || "").toLowerCase() === "medium");
    },

    filteredArticles() {
      return this.platformFilteredArticles().filter((a) => this.matchesSearch(a));
    },

    emptySearchHint() {
      const q = String(this.articleQuery || "").trim();
      if (q) return "Nothing for \"" + q + "\" in this filter. Try another term or platform.";
      return "No articles in this filter yet.";
    },

    editorialMore() {
      const outbound = window.PORTFOLIO_DATA?.editorialOutbound
        || this.$root?.editorialOutbound;
      if (outbound?.links?.length) return outbound;
      return {
        eyebrow: "More writing",
        hint: "Selected notes here — explore the full archive on",
        links: [
          { label: "dev.to", href: "https://dev.to/saniyathossain", icon: "devto", ci: "teal" },
          { label: "Medium", href: "https://saniyathossain.medium.com", icon: "medium", ci: "purple" },
        ],
      };
    },

    reflowEditorialPanel(onSettled) {
      const panel = document.getElementById("editorial-panel");
      if (!panel) {
        if (onSettled) onSettled();
        return;
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const to = panel.scrollHeight;
      if (panel._lastReflowH != null && Math.abs(panel._lastReflowH - to) < 2) {
        if (onSettled) onSettled();
        return;
      }
      if (reduced) {
        panel._lastReflowH = to;
        if (onSettled) onSettled();
        return;
      }

      const from = panel.offsetHeight;
      panel.style.overflow = "hidden";
      panel.style.height = from + "px";

      requestAnimationFrame(() => {
        const target = panel.scrollHeight;
        const settle = () => {
          panel.style.height = "";
          panel.style.overflow = "";
          panel.style.transition = "";
          panel._lastReflowH = panel.scrollHeight;
          if (onSettled) onSettled();
        };
        if (Math.abs(from - target) < 2) {
          settle();
          return;
        }
        editorialAnimateHeight(panel, target + "px", editorialReadReflowMs(), settle);
      });
    },

    lockDockHeight() {
      const dock = this.$refs.dock;
      if (!dock) return;
      dock.style.minHeight = dock.offsetHeight + "px";
    },

    releaseDockHeight() {
      const dock = this.$refs.dock;
      if (!dock) return;
      clearTimeout(this._dockUnlockTimer);
      this._dockUnlockTimer = setTimeout(() => {
        dock.style.minHeight = "";
      }, 460);
    },

    onSearchInput() {
      cancelAnimationFrame(this._searchRaf);
      this._searchRaf = requestAnimationFrame(() => this.reflowEditorialPanel());
    },

    openSearch() {
      if (this.searchMode) return;
      this.lockDockHeight();
      this.searchMode = true;
      this.$nextTick(() => this.$refs.searchInput?.focus());
    },

    closeSearch() {
      if (!this.searchMode) return;
      const hadQuery = String(this.articleQuery || "").trim().length > 0;
      this.searchFocused = false;
      this.articleQuery = "";
      this.searchMode = false;
      this.$refs.searchInput?.blur();
      this.releaseDockHeight();
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          this.syncTabLens();
          if (hadQuery) this.reflowEditorialPanel();
        });
      });
    },

    clearSearch() {
      if (!String(this.articleQuery || "").trim()) return;
      this.articleQuery = "";
      this.$nextTick(() => {
        this.$refs.searchInput?.focus();
        this.reflowEditorialPanel();
      });
    },

    syncTabLens(hoverIdx) {
      const tabs = this.$refs.tablist;
      if (!tabs) return;
      if (this.searchMode || getComputedStyle(tabs).visibility === "hidden") return;

      const btns = Array.from(tabs.querySelectorAll(".editorial-tabs__btn"));
      if (!btns.length) return;

      const activeIdx = btns.findIndex((b) => b.classList.contains("is-active"));
      const idx = hoverIdx >= 0 ? hoverIdx : (activeIdx >= 0 ? activeIdx : 0);
      const btn = btns[idx];
      if (!btn || !btn.offsetWidth) {
        tabs.style.setProperty("--tab-o", "0");
        return;
      }

      const tint = getComputedStyle(btn).getPropertyValue("--tint").trim();
      if (tint) tabs.style.setProperty("--tab-tint", tint);

      // Layout-box coords (not getBoundingClientRect) so active scale() does not skew the lens.
      const x = btn.offsetLeft;
      const y = btn.offsetTop;
      const w = btn.offsetWidth;
      const h = btn.offsetHeight;

      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && tabs._lastTabX != null
        && (Math.abs(x - tabs._lastTabX) > 4 || Math.abs(y - (tabs._lastTabY || 0)) > 4)) {
        tabs.classList.add("is-traveling");
        clearTimeout(tabs._travelTimer);
        tabs._travelTimer = setTimeout(() => tabs.classList.remove("is-traveling"), EDITORIAL_T.LENS_TRAVEL);
      }
      tabs._lastTabX = x;
      tabs._lastTabY = y;

      tabs.style.setProperty("--tab-x", x + "px");
      tabs.style.setProperty("--tab-y", y + "px");
      tabs.style.setProperty("--tab-w", w + "px");
      tabs.style.setProperty("--tab-h", h + "px");
      tabs.style.setProperty("--tab-o", "1");
    },

    bindTabLens() {
      const tabs = this.$refs.tablist;
      if (!tabs || tabs._lensBound) return;
      tabs._lensBound = true;

      let hoverIdx = -1;
      let raf = 0;
      const render = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => this.syncTabLens(hoverIdx));
      };

      tabs.addEventListener("pointerdown", (e) => {
        const btn = e.target.closest(".editorial-tabs__btn");
        if (!btn) return;
        tabs.classList.add("is-pressing");
        const r = btn.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        btn.style.setProperty("--tx", x.toFixed(1) + "%");
        btn.style.setProperty("--ty", y.toFixed(1) + "%");
        btn.classList.add("is-pressed");
      }, { passive: true });
      const releaseBtn = (e) => {
        const btn = e?.target?.closest?.(".editorial-tabs__btn");
        if (btn) btn.classList.remove("is-pressed");
        tabs.classList.remove("is-pressing");
      };
      ["pointerup", "pointerleave", "pointercancel"].forEach((t) => {
        tabs.addEventListener(t, releaseBtn, { passive: true });
      });

      // Delegate — Alpine x-for may recreate buttons; avoid stale per-node listeners.
      tabs.addEventListener("pointerenter", (e) => {
        const btn = e.target.closest?.(".editorial-tabs__btn");
        if (!btn || !tabs.contains(btn)) return;
        hoverIdx = Array.from(tabs.querySelectorAll(".editorial-tabs__btn")).indexOf(btn);
        render();
      }, true);
      tabs.addEventListener("focusin", (e) => {
        const btn = e.target.closest?.(".editorial-tabs__btn");
        if (!btn || !tabs.contains(btn)) return;
        hoverIdx = Array.from(tabs.querySelectorAll(".editorial-tabs__btn")).indexOf(btn);
        render();
      });
      tabs.addEventListener("pointerleave", () => { hoverIdx = -1; render(); });
      tabs.addEventListener("focusout", (e) => {
        if (tabs.contains(e.relatedTarget)) return;
        hoverIdx = -1;
        render();
      });

      if ("ResizeObserver" in window) {
        const ro = new ResizeObserver(() => render());
        ro.observe(tabs);
        tabs._lensRo = ro;
      }
      window.addEventListener("resize", render, { passive: true });
      tabs._lensOnResize = render;
    },

    activeArticles() {
      const list = window.PORTFOLIO_DATA?.articles || this.$root?.articles || [];
      return list
        .filter((a) => a.active)
        .sort((x, y) => String(y.date || "").localeCompare(String(x.date || "")));
    },

    platformTabs() {
      const all = this.activeArticles();
      const devCount = all.filter((a) => String(a.platform || "").toLowerCase().includes("dev")).length;
      const medCount = all.filter((a) => String(a.platform || "").toLowerCase() === "medium").length;
      return [
        { key: "all", label: "All", count: all.length, icon: null, ci: "blue" },
        { key: "dev.to", label: "dev.to", count: devCount, icon: "devto", ci: "teal" },
        { key: "Medium", label: "Medium", count: medCount, icon: "medium", ci: "purple" },
      ];
    },

    setFilter(key) {
      if (key === this.articleFilter) return;

      const panel = document.getElementById("editorial-panel");
      const inner = panel?.querySelector(".editorial-list");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const swap = () => {
        this.articleFilter = key;
        this.listGen += 1;
        this.$nextTick(() => {
          this.syncTabLens();
          this.filterAnim = "enter";

          if (!panel || !inner || reduced) {
            clearTimeout(this._enterTimer);
            this._enterTimer = setTimeout(() => { this.filterAnim = ""; }, 80);
            return;
          }

          this.reflowEditorialPanel(() => {
            clearTimeout(this._enterTimer);
            this._enterTimer = setTimeout(() => { this.filterAnim = ""; }, EDITORIAL_T.ENTER);
          });
        });
      };

      if (reduced || !panel) {
        swap();
        return;
      }

      clearTimeout(this._exitTimer);
      this.filterAnim = "exit";
      this._exitTimer = setTimeout(swap, EDITORIAL_T.EXIT);
    },

    articlePlatformIcon(platform) {
      const p = String(platform || "").toLowerCase();
      return p.includes("dev") ? "devto" : "medium";
    },

    articleDateLabel(date) {
      if (!date) return "";
      const d = new Date(String(date) + "T12:00:00");
      if (Number.isNaN(d.getTime())) return date;
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    },

    articleExcerpt(a) {
      const text = String(a?.excerpt || "").trim();
      if (text) return text;
      return "Notes on backend craft, APIs, and shipping reliable systems.";
    },

    brandOf(name) {
      return window.PORTFOLIO_DATA?.brandOf?.(name)
        || { color: "#6b6b6b", src: null, mono: "?" };
    },

    iconSvg(name, cls) {
      if (this.$parent && typeof this.$parent.iconSvg === "function") {
        return this.$parent.iconSvg(name, cls);
      }
      return window.iconSvg ? window.iconSvg(name, cls) : "";
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("editorialHelpers", editorialHelpers);
});
