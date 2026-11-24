/**
 * Pointer / motion capabilities, read once when the bundle loads (same moment the legacy IIFE read them).
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

export const motionEnvironment = {
  reduce,
  /** Desktop-only enhancements (magnetic CTAs, tilt, spring floats) need a fine pointer and no reduced-motion. */
  canEnhance: finePointer && !reduce,
  /** Touch parallax is half the desktop ranges — present but cheap. */
  parallaxScale: coarsePointer ? 0.5 : 1,
} as const;
