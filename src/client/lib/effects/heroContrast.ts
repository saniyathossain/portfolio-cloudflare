import { HERO_ON_DARK_LUMINANCE, TIMING } from "./constants";
import { orDefault } from "./dom";

const DARK_CLASS = "hero__copy--on-dark";
const DEFAULT_OBJECT_POSITION = 50;

interface HeroElements {
  copy: HTMLElement;
  heading: HTMLElement;
  image: HTMLImageElement;
  backdrop: HTMLElement;
}

function findHeroElements(): HeroElements | null {
  const hero = document.getElementById("home");
  const copy = hero?.querySelector<HTMLElement>(".hero__copy");
  const heading = copy?.querySelector<HTMLElement>("h1");
  const image = document.getElementById("heroBaseImg");
  const backdrop = hero?.querySelector<HTMLElement>(".hero__backdrop");
  if (!hero || !copy || !heading || !(image instanceof HTMLImageElement) || !backdrop) return null;
  return { copy, heading, image, backdrop };
}

/** Parses one `object-position` component ("50%") to a 0..1 fraction, defaulting to centred. */
function positionFraction(token: string | undefined): number {
  return (parseFloat(token ?? "") || DEFAULT_OBJECT_POSITION) / 100;
}

/** Maps a viewport point inside the cover-fitted backdrop to the source image's own pixel space. */
function sourcePoint(
  image: HTMLImageElement,
  backdropRect: DOMRect,
  sampleX: number,
  sampleY: number,
): { left: number; top: number } {
  const tokens = getComputedStyle(image).objectPosition.trim().split(/\s+/);
  const fractionX = positionFraction(tokens[0]);
  const fractionY = positionFraction(orDefault(tokens[1], tokens[0] ?? ""));
  const naturalW = image.naturalWidth;
  const naturalH = image.naturalHeight;
  const scale = Math.max(backdropRect.width / naturalW, backdropRect.height / naturalH);
  const scaledW = naturalW * scale;
  const scaledH = naturalH * scale;
  const imageLeft = backdropRect.left + (backdropRect.width - scaledW) * fractionX;
  const imageTop = backdropRect.top + (backdropRect.height - scaledH) * fractionY;
  return { left: (sampleX - imageLeft) / scale, top: (sampleY - imageTop) / scale };
}

/**
 * Raw Rec. 709 luma of one sampled pixel (no gamma-linearisation — a quick per-frame heuristic; data.js's _readableFg
 * makes the one-time AA-contrast decision for a hex colour).
 */
function pixelLuminance(image: HTMLImageElement, sourceX: number, sourceY: number): number | null {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(image, sourceX, sourceY, 1, 1, 0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data;
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}

function overlapsBackdrop(backdropRect: DOMRect, sampleX: number, sampleY: number): boolean {
  return sampleY < backdropRect.bottom && sampleX > backdropRect.left && sampleX < backdropRect.right;
}

function insideImage(image: HTMLImageElement, left: number, top: number): boolean {
  return left >= 0 && top >= 0 && left <= image.naturalWidth && top <= image.naturalHeight;
}

function updateContrast({ copy, heading, image, backdrop }: HeroElements): void {
  if (!image.complete || !image.naturalWidth) return;

  const headingRect = heading.getBoundingClientRect();
  const backdropRect = backdrop.getBoundingClientRect();
  const sampleX = headingRect.left + headingRect.width * 0.5;
  const sampleY = headingRect.top + headingRect.height * 0.42;

  if (!overlapsBackdrop(backdropRect, sampleX, sampleY)) {
    copy.classList.remove(DARK_CLASS);
    return;
  }

  const source = sourcePoint(image, backdropRect, sampleX, sampleY);
  if (!insideImage(image, source.left, source.top)) {
    copy.classList.remove(DARK_CLASS);
    return;
  }

  const luminance = pixelLuminance(image, source.left, source.top);
  if (luminance === null) return;
  // Threshold sits above the 0.5 midpoint because the hero text also carries a drop-shadow, which reads as legible
  // "on-dark" slightly earlier than raw luminance suggests.
  copy.classList.toggle(DARK_CLASS, luminance < HERO_ON_DARK_LUMINANCE);
}

/** Flips the hero copy to its on-dark treatment when the photo behind the heading is dark. */
export function setupHeroContrast(): void {
  const elements = findHeroElements();
  if (!elements) return;
  const { image } = elements;
  const update = (): void => {
    updateContrast(elements);
  };

  // rAF-coalesced: update() forces a canvas pixel readback, so resize-drag storms must not run it per event.
  let frame = 0;
  const scheduleUpdate = (): void => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  };

  image.addEventListener("load", update);
  if (image.complete) update();
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("portfolio-ready", () => {
    requestAnimationFrame(update);
    setTimeout(update, TIMING.heroSettle);
  });
}
