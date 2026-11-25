/**
 * Hero depth effects: pointer-driven spatial parallax on the hero image plane, and the scroll-driven float on the
 * aurora / watermark / liquid layers.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import { motionEnvironment } from "./environment";

const { reduce, canEnhance, parallaxScale } = motionEnvironment;
const SPATIAL_RANGE_X = 9;
const SPATIAL_RANGE_Y = 7;

/** Shared with scrollParallax(): written by its IntersectionObserver, read by applyParallax(). */
export const heroVisibility = { inView: true };

/**
 * iOS-style spatial parallax for the hero image: the image plane drifts opposite the pointer, independent of (but
 * composed with, in CSS) the scroll-linked --hero-liquid-y on the same element. Hand-rolled spring (not Motion One's
 * animate()) because animate() writes a competing inline style.transform that would silently clobber the scroll
 * transform's CSS custom-property value — this settle loop only ever touches --hero-spatial-x/y.
 */
export function heroSpatial(): void {
  if (!canEnhance) return;
  const hero = document.getElementById("home");
  const layer = document.getElementById("heroLiquid");
  if (!hero || !layer) return;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let frame = 0;

  const settle = (): void => {
    currentX += (targetX - currentX) * 0.12;
    currentY += (targetY - currentY) * 0.12;
    layer.style.setProperty("--hero-spatial-x", `${currentX.toFixed(2)}px`);
    layer.style.setProperty("--hero-spatial-y", `${currentY.toFixed(2)}px`);
    frame = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05 ? requestAnimationFrame(settle) : 0;
  };

  function kick(): void {
    if (!frame) frame = requestAnimationFrame(settle);
  }

  hero.addEventListener(
    "pointermove",
    (event) => {
      const rect = hero.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * -2 * SPATIAL_RANGE_X;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * -2 * SPATIAL_RANGE_Y;
      kick();
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", () => {
    targetX = 0;
    targetY = 0;
    kick();
  });
}

/**
 * Desktop-only (canEnhance) spring float on the hero parallax layers — same kick()/settle() persistent-rAF-loop shape
 * as heroSpatial() above, NOT a step-once-per-scroll-event lerp. A previous version stepped the lerp only inside the
 * scroll-triggered rAF, which meant the float PERMANENTLY stopped converging the instant the user stopped scrolling
 * (scrolling 300px, target 30px, would freeze at 9px forever). The float therefore has its own self-continuing loop
 * that keeps stepping every frame — independent of new scroll events — until it actually settles.
 */
const heroFloat = {
  targetAuroraY: 0,
  targetWatermarkY: 0,
  targetLiquidY: 0,
  currentAuroraY: 0,
  currentWatermarkY: 0,
  currentLiquidY: 0,
  initialised: false,
  frame: 0,
};

export function writeHeroParallaxVars(auroraY: number, watermarkY: number, liquidY: number): void {
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--aurora-y", `${auroraY.toFixed(1)}px`);
  rootStyle.setProperty("--wm-parallax-y", `${watermarkY.toFixed(1)}px`);
  rootStyle.setProperty("--hero-liquid-y", `${liquidY.toFixed(1)}px`);
  const glow = document.getElementById("heroGlow");
  if (glow) glow.style.setProperty("--glow-parallax-y", `${(auroraY * 1.4).toFixed(1)}px`);
}

function settleHeroFloat(): void {
  heroFloat.currentAuroraY += (heroFloat.targetAuroraY - heroFloat.currentAuroraY) * 0.3;
  heroFloat.currentWatermarkY += (heroFloat.targetWatermarkY - heroFloat.currentWatermarkY) * 0.3;
  heroFloat.currentLiquidY += (heroFloat.targetLiquidY - heroFloat.currentLiquidY) * 0.3;
  writeHeroParallaxVars(heroFloat.currentAuroraY, heroFloat.currentWatermarkY, heroFloat.currentLiquidY);
  const settled =
    Math.abs(heroFloat.targetAuroraY - heroFloat.currentAuroraY) < 0.05 &&
    Math.abs(heroFloat.targetWatermarkY - heroFloat.currentWatermarkY) < 0.05 &&
    Math.abs(heroFloat.targetLiquidY - heroFloat.currentLiquidY) < 0.05;
  heroFloat.frame = settled ? 0 : requestAnimationFrame(settleHeroFloat);
}

export function resetHeroFloat(): void {
  cancelAnimationFrame(heroFloat.frame);
  heroFloat.frame = 0;
  heroFloat.targetAuroraY = 0;
  heroFloat.targetWatermarkY = 0;
  heroFloat.targetLiquidY = 0;
  heroFloat.currentAuroraY = 0;
  heroFloat.currentWatermarkY = 0;
  heroFloat.currentLiquidY = 0;
  heroFloat.initialised = false;
}

export function applyParallax(scrollY: number): void {
  if (reduce || !heroVisibility.inView) return;
  const auroraY = Math.min(scrollY * 0.1 * parallaxScale, 70 * parallaxScale);
  const watermarkY = Math.min(scrollY * 0.06 * parallaxScale, 48 * parallaxScale);
  const liquidY = Math.min(scrollY * 0.08 * parallaxScale, 56 * parallaxScale);
  if (!canEnhance) {
    writeHeroParallaxVars(auroraY, watermarkY, liquidY);
    return;
  }
  heroFloat.targetAuroraY = auroraY;
  heroFloat.targetWatermarkY = watermarkY;
  heroFloat.targetLiquidY = liquidY;
  if (!heroFloat.initialised) {
    heroFloat.currentAuroraY = auroraY;
    heroFloat.currentWatermarkY = watermarkY;
    heroFloat.currentLiquidY = liquidY;
    heroFloat.initialised = true;
    writeHeroParallaxVars(auroraY, watermarkY, liquidY);
    return;
  }
  if (!heroFloat.frame) heroFloat.frame = requestAnimationFrame(settleHeroFloat);
}
