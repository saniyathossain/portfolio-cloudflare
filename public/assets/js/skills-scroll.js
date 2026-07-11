/**
 * Skills scroll-reveal — Skiper31-style pill cloud (scroll progress drives spread/3D).
 * Only runs when [data-skills-scroll] is present (SKILLS_SCROLL_DESIGN Worker flag).
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function bind(stage) {
    if (stage.__skillsScrollBound) return;
    const cloud = stage.querySelector(".skills-scroll__cloud");
    if (!cloud) return;

    function pills() {
      return Array.from(cloud.querySelectorAll(".skills-scroll__pill"));
    }

    function resetStatic(list) {
      list.forEach((el) => {
        el.style.transform = "";
        el.style.opacity = "";
      });
    }

    function update() {
      const list = pills();
      if (!list.length) return;

      if (reduce) {
        resetStatic(list);
        return;
      }

      const rect = stage.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const track = Math.max(rect.height - vh, 1);
      const raw = clamp(-rect.top, 0, track) / track;
      const progress = easeOutCubic(raw);
      const cluster = 1 - progress;
      const center = (list.length - 1) / 2;
      const denom = center > 0 ? center : 1;

      list.forEach((el, i) => {
        const norm = (i - center) / denom;
        const pullX = norm * cluster * -3.8;
        const pullY = Math.abs(norm) * cluster * 1.1;
        const rotY = norm * cluster * 38;
        const rotZ = norm * cluster * -14;
        const scale = 0.68 + progress * 0.32;
        const opacity = 0.42 + progress * 0.58;

        el.style.transform =
          "translate3d(" +
          pullX.toFixed(2) +
          "rem," +
          pullY.toFixed(2) +
          "rem,0) rotateY(" +
          rotY.toFixed(2) +
          "deg) rotateZ(" +
          rotZ.toFixed(2) +
          "deg) scale(" +
          scale.toFixed(3) +
          ")";
        el.style.opacity = String(opacity.toFixed(3));
      });
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    }

    stage.__skillsScrollBound = true;
    stage.__skillsScrollUpdate = update;
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    const mo = new MutationObserver(() => update());
    mo.observe(cloud, { childList: true, subtree: true });
  }

  function tryBind() {
    document.querySelectorAll("[data-skills-scroll]").forEach(bind);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryBind);
  } else {
    tryBind();
  }
  window.addEventListener("portfolio-ready", tryBind);
  window.addEventListener("portfolio-data-ready", tryBind);

  const rootMo = new MutationObserver(tryBind);
  rootMo.observe(document.documentElement, { childList: true, subtree: true });
})();
