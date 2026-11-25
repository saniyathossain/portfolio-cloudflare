/**
 * Scroll wiring for the hero + element parallax: hero in-view observer, rAF-throttled scroll listener, resize re-collect.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import { applyElementParallax, collectParallax } from "./elementParallax";
import { applyParallax, heroVisibility, resetHeroFloat, writeHeroParallaxVars } from "./heroParallax";
import { motionEnvironment } from "./environment";

let scrollFrame = 0;

function observeHeroVisibility(hero: HTMLElement): void {
  const observer = new IntersectionObserver(
    (entries) => {
      heroVisibility.inView = entries.some((entry) => entry.isIntersecting);
      if (heroVisibility.inView) return;
      // Reset the float's internal target/current state too, not just the CSS vars — otherwise re-entering view
      // resumes the lerp from a stale value and the aurora/watermark visibly jumps from wherever it was left instead
      // of starting fresh at 0.
      resetHeroFloat();
      writeHeroParallaxVars(0, 0, 0);
    },
    { root: null, threshold: 0, rootMargin: "0px 0px -20% 0px" },
  );
  observer.observe(hero);
}

export function scrollParallax(): void {
  if (motionEnvironment.reduce) return;
  collectParallax();

  const hero = document.getElementById("home");
  if (hero && "IntersectionObserver" in window) observeHeroVisibility(hero);

  window.addEventListener(
    "scroll",
    () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const scrollY = window.scrollY;
        applyParallax(scrollY);
        applyElementParallax(scrollY);
      });
    },
    { passive: true },
  );
  window.addEventListener("resize", collectParallax, { passive: true });
  applyElementParallax(window.scrollY);
}
