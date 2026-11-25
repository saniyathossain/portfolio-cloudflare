/**
 * Decorative infinite CSS animations: pause them while off-screen, freeze the hero beam once it has revealed.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import { motionEnvironment } from "./environment";

/**
 * .beam conic-rotate and create-band pulse/float were only paused on html.is-idle — they kept repainting while merely
 * scrolled off-screen. One shared observer adds .is-paused (CSS: animation-play-state: paused) so scrolling past them
 * costs nothing.
 */
export function pauseOffscreenDecor(): void {
  if (motionEnvironment.reduce || !("IntersectionObserver" in window)) return;
  const targets = document.querySelectorAll(".beam, .create-band--flow");
  if (!targets.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) entry.target.classList.toggle("is-paused", !entry.isIntersecting);
    },
    { root: null, threshold: 0, rootMargin: "200px 0px" },
  );
  targets.forEach((target) => {
    observer.observe(target);
  });
}

/** Hero card's conic beam is decorative post-entrance — freeze once visible so it doesn't repaint while the hero shows. */
export function settleHeroBeam(): void {
  const card = document.querySelector(".hero-card.beam");
  if (!card) return;
  const settle = (): void => {
    card.classList.add("beam-is-settled");
  };
  if (card.classList.contains("is-visible")) {
    settle();
    return;
  }
  if (!("MutationObserver" in window)) return;
  const observer = new MutationObserver(() => {
    if (!card.classList.contains("is-visible")) return;
    settle();
    observer.disconnect();
  });
  observer.observe(card, { attributes: true, attributeFilter: ["class"] });
}
