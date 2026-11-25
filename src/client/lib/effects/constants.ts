/** Shared timing / threshold constants for the page-level effects. */
export const TIMING = {
  heroSettle: 120, // re-check hero contrast shortly after fonts/layout settle
} as const;

/** Luminance below which the hero text flips to its on-dark treatment. */
export const HERO_ON_DARK_LUMINANCE = 0.58;

export { REDUCED_MOTION_QUERY, prefersReducedMotion } from "../../../lib/browser/reducedMotion";
