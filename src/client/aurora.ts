/**
 * Aurora gradient canvas — flowing Tahoe liquid-light field.
 * Desktop/fine-pointer + no-reduced-motion only (gated by boot.js and self-guarded).
 * Low-res buffer (blurred + upscaled via CSS), ~24fps, paused when the tab is hidden.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import { prefersReducedMotion } from "../lib/browser/reducedMotion";

export {};

declare global {
  interface Window {
    __portfolioReady?: boolean;
  }
}

/**
 * Field legend — rgb: "r,g,b" color; alphaScale: alpha multiplier on the gradient stops; centerX/centerY: base center
 * (fraction of canvas W/H); driftX/driftY: drift amplitude around that center (same fraction units);
 * speedX/speedY: drift angular speed (radians per ms — how fast it oscillates, not how far); phase: phase
 * offset (radians) so blobs don't all swing in lockstep; radius: base radius (fraction of min(W,H)).
 */
interface AuroraBlob {
  rgb: string;
  alphaScale: number;
  driftX: number;
  driftY: number;
  speedX: number;
  speedY: number;
  phase: number;
  centerX: number;
  centerY: number;
  radius: number;
}

// Desaturated Tahoe palette blobs. Each drifts on its own layered sines (see drawFrame(), below).
// Whisper-subtle Tahoe field: cool-led, red/pink pulled back, one warm "sun blare" focal.
const BLOBS: readonly AuroraBlob[] = [
  { rgb: "110,108,240", alphaScale: 1.0, driftX: 0.15, driftY: 0.1, speedX: 0.01, speedY: 0.015, phase: 0.0, centerX: 0.14, centerY: 0.1, radius: 0.6 },
  { rgb: "10,132,255", alphaScale: 0.95, driftX: 0.13, driftY: 0.11, speedX: 0.012, speedY: 0.008, phase: 1.7, centerX: 0.86, centerY: 0.08, radius: 0.56 },
  { rgb: "63,208,224", alphaScale: 0.95, driftX: 0.16, driftY: 0.13, speedX: 0.007, speedY: 0.014, phase: 3.1, centerX: 0.82, centerY: 0.84, radius: 0.64 },
  { rgb: "255,220,175", alphaScale: 1.15, driftX: 0.09, driftY: 0.06, speedX: 0.006, speedY: 0.009, phase: 4.4, centerX: 0.78, centerY: 0.1, radius: 0.46 },
  { rgb: "255,159,10", alphaScale: 0.5, driftX: 0.12, driftY: 0.1, speedX: 0.013, speedY: 0.01, phase: 4.9, centerX: 0.1, centerY: 0.88, radius: 0.42 },
  { rgb: "255,92,138", alphaScale: 0.3, driftX: 0.15, driftY: 0.13, speedX: 0.009, speedY: 0.012, phase: 5.6, centerX: 0.42, centerY: 0.52, radius: 0.34 },
  { rgb: "177,95,44", alphaScale: 0.5, driftX: 0.11, driftY: 0.1, speedX: 0.011, speedY: 0.009, phase: 2.3, centerX: 0.7, centerY: 0.4, radius: 0.36 },
];

const FRAME_MS = 55; // ~18fps — drift is slow; fewer wakes = smoother main thread + better lab scores
const TIME_SCALE = 0.06;
const MAX_BUFFER_EDGE = 640;
const READY_WILL_CHANGE_RELEASE_MS = 1600;
const IDLE_TIMEOUT_MS = 2500;
const NO_IDLE_CALLBACK_DELAY_MS = 1200;

function findOrCreateCanvas(): HTMLCanvasElement {
  const existing = document.getElementById("auroraCanvas");
  if (existing instanceof HTMLCanvasElement) return existing;
  const canvas = document.createElement("canvas");
  canvas.id = "auroraCanvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);
  return canvas;
}

/** Runs `callback` once the page is idle — a static first frame + CSS fallback cover the gap before it. */
function whenIdle(callback: () => void): void {
  if ("requestIdleCallback" in window) requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
  else setTimeout(callback, NO_IDLE_CALLBACK_DELAY_MS);
}

function init(): void {
  const canvas = findOrCreateCanvas();
  const context = canvas.getContext("2d");
  if (!context) return;

  let width = 0;
  let height = 0;
  let minDimension = 0;

  const resize = (): void => {
    // Low-res buffer: cap the long edge ~640px, DPR 1 (it's heavily blurred anyway).
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scale = Math.min(MAX_BUFFER_EDGE / Math.max(viewportWidth, viewportHeight), 1);
    width = Math.max(1, Math.round(viewportWidth * scale));
    height = Math.max(1, Math.round(viewportHeight * scale));
    canvas.width = width;
    canvas.height = height;
    minDimension = Math.min(width, height);
  };

  const drawBlob = (blob: AuroraBlob, time: number): void => {
    const centerX = (blob.centerX + blob.driftX * Math.sin(time * blob.speedX + blob.phase)) * width;
    const centerY = (blob.centerY + blob.driftY * Math.cos(time * blob.speedY + blob.phase * 1.3)) * height;
    const radius = blob.radius * minDimension * (0.9 + 0.1 * Math.sin(time * 0.006 + blob.phase));
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, `rgba(${blob.rgb},${(0.34 * blob.alphaScale).toFixed(3)})`);
    gradient.addColorStop(0.5, `rgba(${blob.rgb},${(0.14 * blob.alphaScale).toFixed(3)})`);
    gradient.addColorStop(1, `rgba(${blob.rgb},0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  };

  const drawFrame = (time: number): void => {
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "lighter";
    for (const blob of BLOBS) drawBlob(blob, time);
    context.globalCompositeOperation = "source-over";
  };

  // setTimeout-paced (not a 60fps rAF poll that skips most frames) — the main thread only wakes
  // ~24x/sec to draw, instead of 60x/sec to check-and-mostly-skip.
  let timer = 0;
  let animationFrame = 0;
  let running = false;

  const tick = (): void => {
    drawFrame(performance.now() * TIME_SCALE);
    animationFrame = requestAnimationFrame(() => {
      timer = window.setTimeout(tick, FRAME_MS);
    });
  };
  const start = (): void => {
    if (running) return;
    running = true;
    tick();
  };
  const stop = (): void => {
    running = false;
    clearTimeout(timer);
    cancelAnimationFrame(animationFrame);
  };

  resize();
  window.addEventListener("resize", () => {
    resize();
    if (!running) drawFrame(performance.now() * TIME_SCALE);
  });
  // Pause the canvas loop whenever the page isn't actually being looked at — tab hidden AND window
  // blurred (switched to another app/window). Continuously repainting a full-screen blurred canvas
  // in the background is the main battery cost on laptops (notably Safari), and freezing an ambient
  // drift while it's not visible changes nothing the user can see.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
  window.addEventListener("blur", stop);
  window.addEventListener("focus", start);

  drawFrame(0);
  document.documentElement.classList.add("has-aurora");
  requestAnimationFrame(() => {
    canvas.classList.add("is-ready");
    // Release promoted layer once the fade-in settles — persistent will-change costs compositor RAM.
    setTimeout(() => {
      canvas.style.willChange = "auto";
    }, READY_WILL_CHANGE_RELEASE_MS);
  });
  const startLoop = (): void => {
    if (!running) start();
  };
  // Defer the paint loop until after load/LCP.
  if (document.readyState === "complete") {
    whenIdle(startLoop);
    return;
  }
  window.addEventListener("load", () => {
    whenIdle(startLoop);
  }, { once: true });
}

function bootstrap(): void {
  if (prefersReducedMotion()) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;
  window.addEventListener("portfolio-ready", init);
  if (window.__portfolioReady) init();
}

bootstrap();
