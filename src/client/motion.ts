/**
 * Motion — pointer specular + scroll parallax (vanilla, always on desktop); magnetic CTAs + hero tilt (own rAF spring).
 * Thin entry: each effect lives in src/client/lib/motion/. Boots on `portfolio-ready`; reduced-motion does nothing.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import { clockTapZoom, liquidTouch } from "./lib/motion/touch";
import { motionEnvironment } from "./lib/motion/environment";
import { pauseOffscreenDecor, settleHeroBeam } from "./lib/motion/decor";
import { applyParallax, heroSpatial } from "./lib/motion/heroParallax";
import { magnetic, specular, tilt } from "./lib/motion/pointerEffects";
import { pillFlip } from "./lib/motion/pillFlip";
import { setupPillRowReflow } from "./lib/motion/pillReflow";
import { pillTap } from "./lib/motion/pillTap";
import { scrollParallax } from "./lib/motion/scrollParallax";

declare global {
  interface Window {
    __portfolioReady?: boolean;
  }
}

function enhancePointerTargets(): void {
  if (!motionEnvironment.canEnhance) return;
  document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((element) => {
    magnetic(element);
  });
  const card = document.querySelector<HTMLElement>(".hero-card");
  if (card) tilt(card);
}

function boot(): void {
  enhancePointerTargets();
  specular();
  scrollParallax();
  heroSpatial();
  const reflowPanel = setupPillRowReflow();
  pillFlip(reflowPanel);
  pillTap(reflowPanel);
  pauseOffscreenDecor();
  settleHeroBeam();
  liquidTouch();
  clockTapZoom();
  if (!motionEnvironment.reduce) applyParallax(window.scrollY || 0);
}

function bootstrap(): void {
  if (motionEnvironment.reduce) return; // reduced-motion: nothing animates.
  window.addEventListener("portfolio-ready", boot);
  if (window.__portfolioReady) boot();
}

bootstrap();
