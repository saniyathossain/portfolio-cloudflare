/**
 * Generic depth parallax for any [data-parallax] element — transform-only, in-view only, cheap. Speed is the attribute
 * value (data-parallax="0.05"); data-parallax-speed is kept as a legacy alias. Position/height/speed are read once per
 * collect (load + resize), not per scroll frame — calling getBoundingClientRect() inside the scroll rAF forces a
 * synchronous layout every frame for every element. Instead each element's document-relative top (rect.top + scrollY at
 * collect time, which stays valid as the page scrolls) is cached and the viewport-relative top is derived per frame with
 * plain arithmetic (docTop - scrollY).
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import { motionEnvironment } from "./environment";

const { reduce, canEnhance, parallaxScale } = motionEnvironment;
const OFFSCREEN_MARGIN_PX = 240;
const DEFAULT_SPEED = "0.12";

interface ParallaxEntry {
  element: HTMLElement;
  docTop: number;
  height: number;
  speed: number;
  /** Where the float is heading (set per scroll frame). */
  targetOffset?: number;
  /** Where the float currently is (lerped toward targetOffset). */
  currentOffset?: number;
}

let parallaxEntries: ParallaxEntry[] = [];
let floatFrame = 0;

function readSpeedAttribute(element: HTMLElement): string {
  const primary = element.getAttribute("data-parallax");
  if (primary) return primary;
  const legacy = element.getAttribute("data-parallax-speed");
  if (legacy) return legacy;
  return DEFAULT_SPEED;
}

export function collectParallax(): void {
  const scrollY = window.scrollY;
  parallaxEntries = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"), (element) => {
    const rect = element.getBoundingClientRect();
    const speed = parseFloat(readSpeedAttribute(element)) * parallaxScale;
    return { element, docTop: rect.top + scrollY, height: rect.height, speed };
  });
}

function writeParallaxY(entry: ParallaxEntry, offset: number): void {
  entry.element.style.setProperty("--parallax-y", `${offset.toFixed(1)}px`);
}

/**
 * Persistent loop shared across all [data-parallax] elements in one rAF chain (not one loop per element) — keeps
 * stepping every frame until every element's lerp has converged to its current target, then stops;
 * applyElementParallax() only updates targets and (re)kicks this loop, it never advances the lerp itself.
 */
function settleElementFloat(): void {
  let anyActive = false;
  for (const entry of parallaxEntries) {
    if (entry.targetOffset === undefined || entry.currentOffset === undefined) continue;
    const delta = entry.targetOffset - entry.currentOffset;
    if (Math.abs(delta) > 0.05) {
      entry.currentOffset += delta * 0.3;
      anyActive = true;
    } else {
      entry.currentOffset = entry.targetOffset;
    }
    writeParallaxY(entry, entry.currentOffset);
  }
  floatFrame = anyActive ? requestAnimationFrame(settleElementFloat) : 0;
}

/** Returns true when this entry needs the float loop kicked. */
function updateEntry(entry: ParallaxEntry, scrollY: number, viewportHeight: number): boolean {
  const top = entry.docTop - scrollY;
  if (top + entry.height < -OFFSCREEN_MARGIN_PX || top > viewportHeight + OFFSCREEN_MARGIN_PX) return false; // far off-screen
  const offset = (top + entry.height / 2 - viewportHeight / 2) * -entry.speed;
  if (!canEnhance) {
    writeParallaxY(entry, offset);
    return false;
  }
  entry.targetOffset = offset;
  if (entry.currentOffset === undefined) {
    entry.currentOffset = offset;
    writeParallaxY(entry, offset);
    return false;
  }
  return true;
}

export function applyElementParallax(scrollY: number): void {
  if (reduce || !parallaxEntries.length) return;
  const viewportHeight = window.innerHeight;
  let needsKick = false;
  for (const entry of parallaxEntries) {
    if (updateEntry(entry, scrollY, viewportHeight)) needsKick = true;
  }
  if (needsKick && !floatFrame) floatFrame = requestAnimationFrame(settleElementFloat);
}
