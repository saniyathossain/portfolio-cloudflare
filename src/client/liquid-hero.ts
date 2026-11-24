/**
 * Hero liquid cursor-reveal canvas (Lumora after base + before brush).
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */

export {};

declare global {
  interface Window {
    __portfolioReady?: boolean;
  }
}

interface Point {
  posX: number;
  posY: number;
}

const BRUSH_FRACTION = 0.34;
const DECAY = 0.016;
const IDLE_MAX = 120;
const IDLE_FADE_STEP = 0.004;
const MAX_FADE = 0.5;
const MAX_INTERPOLATED_POINTS = 60;
const BRUSH_IMAGE_SRC = "/assets/img/saniyat-hossain-1800.webp";
const DEFAULT_IMAGE_POSITION: Point = { posX: 0.5, posY: 0.12 };
const COVER_FILTER = "saturate(1.25) contrast(1.06) brightness(1.03)";

function readObjectPosition(image: HTMLImageElement): Point {
  const raw = getComputedStyle(image).objectPosition.trim().split(/\s+/);
  const positionX = parseFloat(raw[0] ?? "");
  const positionY = parseFloat(raw[1] ?? raw[0] ?? "");
  return {
    posX: Number.isFinite(positionX) ? positionX / 100 : 0.5,
    posY: Number.isFinite(positionY) ? positionY / 100 : 0.5,
  };
}

interface HeroElements {
  container: HTMLElement;
  baseImage: HTMLImageElement;
  brushImage: HTMLImageElement;
  canvas: HTMLCanvasElement;
}

function findHeroElements(): HeroElements | null {
  const container = document.getElementById("heroLiquid");
  const baseImage = document.getElementById("heroBaseImg");
  const brushImage = document.getElementById("heroBrushImg");
  const canvas = document.getElementById("heroCanvas");
  if (!container) return null;
  if (!(baseImage instanceof HTMLImageElement) || !(brushImage instanceof HTMLImageElement)) return null;
  if (!(canvas instanceof HTMLCanvasElement)) return null;
  return { container, baseImage, brushImage, canvas };
}

function init(): void {
  const elements = findHeroElements();
  if (!elements) return;
  const { container, baseImage, brushImage, canvas } = elements;
  // Loaded lazily here (not a static <img src>) so mobile/no-JS/reduced-motion loads never pay
  // for this desktop-only brush asset — reuses the largest hero webp variant, no extra file.
  if (!brushImage.src) brushImage.src = BRUSH_IMAGE_SRC;

  const context = canvas.getContext("2d");
  if (!context) return;
  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  let cover: HTMLCanvasElement | null = null;
  let brush: HTMLCanvasElement | null = null;
  let radius = 0;
  let points: Point[] = [];
  let last: Point | null = null;
  let idle = 0;
  let animationFrame = 0;
  let imagePosition: Point = DEFAULT_IMAGE_POSITION;

  const drawCover = (): void => {
    if (!cover) return;
    const coverContext = cover.getContext("2d");
    if (!coverContext) return;
    coverContext.clearRect(0, 0, cover.width, cover.height);
    const source = brushImage.complete && brushImage.naturalWidth ? brushImage : baseImage;
    if (!source.complete || !source.naturalWidth) return;
    const imageWidth = source.naturalWidth;
    const imageHeight = source.naturalHeight;
    const scale = Math.max(cover.width / imageWidth, cover.height / imageHeight);
    const scaledWidth = imageWidth * scale;
    const scaledHeight = imageHeight * scale;
    const offsetX = (cover.width - scaledWidth) * imagePosition.posX;
    const offsetY = (cover.height - scaledHeight) * imagePosition.posY;
    coverContext.filter = COVER_FILTER;
    coverContext.drawImage(source, offsetX, offsetY, scaledWidth, scaledHeight);
    coverContext.filter = "none";
  };

  const sizeCanvas = (): void => {
    const rect = container.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatio));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    radius = Math.min(rect.width, rect.height) * BRUSH_FRACTION * devicePixelRatio;
    cover = document.createElement("canvas");
    cover.width = canvas.width;
    cover.height = canvas.height;
    brush = document.createElement("canvas");
    const diameter = Math.ceil(radius * 2);
    brush.width = diameter;
    brush.height = diameter;
    imagePosition = readObjectPosition(baseImage);
    drawCover();
  };

  const stamp = (pointX: number, pointY: number): void => {
    const brushContext = brush?.getContext("2d");
    if (!brush || !cover || !brushContext) return;
    const diameter = brush.width;
    const center = radius;
    brushContext.clearRect(0, 0, diameter, diameter);
    const gradient = brushContext.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.82)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    brushContext.fillStyle = gradient;
    brushContext.fillRect(0, 0, diameter, diameter);
    brushContext.globalCompositeOperation = "source-in";
    brushContext.drawImage(cover, pointX - center, pointY - center, diameter, diameter, 0, 0, diameter, diameter);
    brushContext.globalCompositeOperation = "source-over";
    context.globalCompositeOperation = "source-over";
    context.drawImage(brush, pointX - center, pointY - center);
  };

  const tick = (): void => {
    const drawing = points.length > 0;
    if (drawing) idle = 0;
    else idle++;
    if (idle > IDLE_MAX && !drawing) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      animationFrame = 0; // fully idle — stop the loop (restarts on the next pointer move) so we don't burn frames
      return;
    }
    const fade = drawing ? DECAY : Math.min(DECAY + idle * IDLE_FADE_STEP, MAX_FADE);
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = `rgba(0,0,0,${fade})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = "source-over";
    if (drawing) {
      for (const point of points) stamp(point.posX, point.posY);
      points = [];
    }
    animationFrame = requestAnimationFrame(tick);
  };

  const isOutsideCanvas = (pointX: number, pointY: number): boolean =>
    pointX < -radius || pointY < -radius || pointX > canvas.width + radius || pointY > canvas.height + radius;

  const interpolateFrom = (from: Point, to: Point): void => {
    const deltaX = to.posX - from.posX;
    const deltaY = to.posY - from.posY;
    const distance = Math.hypot(deltaX, deltaY);
    const step = Math.max(radius * 0.3, 1);
    const count = Math.min(Math.ceil(distance / step), MAX_INTERPOLATED_POINTS);
    for (let index = 1; index <= count; index++) {
      const progress = index / count;
      points.push({ posX: from.posX + deltaX * progress, posY: from.posY + deltaY * progress });
    }
  };

  const queuePoint = (clientX: number, clientY: number): void => {
    const rect = canvas.getBoundingClientRect();
    const pointX = (clientX - rect.left) * devicePixelRatio;
    const pointY = (clientY - rect.top) * devicePixelRatio;
    if (isOutsideCanvas(pointX, pointY)) {
      last = null;
      return;
    }
    const current = { posX: pointX, posY: pointY };
    if (!last) {
      last = current;
      points.push({ posX: pointX, posY: pointY });
      return;
    }
    interpolateFrom(last, current);
    last = current;
  };

  const ensureLoopRunning = (): void => {
    if (!animationFrame) animationFrame = requestAnimationFrame(tick);
  };

  const onPointerMove = (event: PointerEvent): void => {
    queuePoint(event.clientX, event.clientY);
    ensureLoopRunning();
  };

  const onPointerDown = (event: PointerEvent): void => {
    last = null;
    queuePoint(event.clientX, event.clientY);
    ensureLoopRunning();
  };

  const onPointerLeave = (): void => {
    last = null;
  };

  const onImagesReady = (): void => {
    imagePosition = readObjectPosition(baseImage);
    drawCover();
  };

  baseImage.addEventListener("load", onImagesReady);
  brushImage.addEventListener("load", onImagesReady);
  if (baseImage.complete && brushImage.complete) onImagesReady();
  sizeCanvas();
  new ResizeObserver(sizeCanvas).observe(container);
  container.addEventListener("pointermove", onPointerMove, { passive: true });
  container.addEventListener("pointerdown", onPointerDown, { passive: true });
  container.addEventListener("pointerleave", onPointerLeave);
}

function bootstrap(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;
  window.addEventListener("portfolio-ready", init);
  if (window.__portfolioReady) init();
}

bootstrap();
