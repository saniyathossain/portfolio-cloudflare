/**
 * Aurora gradient canvas — flowing Tahoe liquid-light field.
 * Desktop/fine-pointer + no-reduced-motion only (gated by boot.js and self-guarded).
 * Low-res buffer (blurred + upscaled via CSS), ~24fps, paused when the tab is hidden.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;

  // Desaturated Tahoe palette blobs. Each drifts on its own layered sines (see draw(), below).
  // Whisper-subtle Tahoe field: cool-led, red/pink pulled back, one warm "sun blare" focal.
  // Field legend — h: "r,g,b" color; k: alpha multiplier on the gradient stops; x/y: base center
  // (fraction of canvas W/H); ax/ay: drift amplitude around that center (same fraction units);
  // sx/sy: drift angular speed (radians per ms — how fast it oscillates, not how far); ph: phase
  // offset (radians) so blobs don't all swing in lockstep; r: base radius (fraction of min(W,H)).
  const BLOBS = [
    { h: "110,108,240", k: 1.00, ax: 0.15, ay: 0.10, sx: 0.010, sy: 0.015, ph: 0.0, x: 0.14, y: 0.10, r: 0.60 },
    { h: "10,132,255",  k: 0.95, ax: 0.13, ay: 0.11, sx: 0.012, sy: 0.008, ph: 1.7, x: 0.86, y: 0.08, r: 0.56 },
    { h: "63,208,224",  k: 0.95, ax: 0.16, ay: 0.13, sx: 0.007, sy: 0.014, ph: 3.1, x: 0.82, y: 0.84, r: 0.64 },
    { h: "255,220,175", k: 1.15, ax: 0.09, ay: 0.06, sx: 0.006, sy: 0.009, ph: 4.4, x: 0.78, y: 0.10, r: 0.46 },
    { h: "255,159,10",  k: 0.50, ax: 0.12, ay: 0.10, sx: 0.013, sy: 0.010, ph: 4.9, x: 0.10, y: 0.88, r: 0.42 },
    { h: "255,92,138",  k: 0.30, ax: 0.15, ay: 0.13, sx: 0.009, sy: 0.012, ph: 5.6, x: 0.42, y: 0.52, r: 0.34 },
    { h: "177,95,44",   k: 0.50, ax: 0.11, ay: 0.10, sx: 0.011, sy: 0.009, ph: 2.3, x: 0.70, y: 0.40, r: 0.36 },
  ];
  const FRAME_MS = 55; // ~18fps — drift is slow; fewer wakes = smoother main thread + better lab scores

  function init() {
    let canvas = document.getElementById("auroraCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "auroraCanvas";
      canvas.setAttribute("aria-hidden", "true");
      document.body.insertBefore(canvas, document.body.firstChild);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, minDim = 0;

    function resize() {
      // Low-res buffer: cap the long edge ~640px, DPR 1 (it's heavily blurred anyway).
      const vw = window.innerWidth, vh = window.innerHeight;
      const scale = Math.min(640 / Math.max(vw, vh), 1);
      W = Math.max(1, Math.round(vw * scale));
      H = Math.max(1, Math.round(vh * scale));
      canvas.width = W;
      canvas.height = H;
      minDim = Math.min(W, H);
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const b of BLOBS) {
        const cx = (b.x + b.ax * Math.sin(t * b.sx + b.ph)) * W;
        const cy = (b.y + b.ay * Math.cos(t * b.sy + b.ph * 1.3)) * H;
        const rad = b.r * minDim * (0.9 + 0.1 * Math.sin(t * 0.006 + b.ph));
        const k = b.k == null ? 1 : b.k;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, "rgba(" + b.h + "," + (0.34 * k).toFixed(3) + ")");
        g.addColorStop(0.5, "rgba(" + b.h + "," + (0.14 * k).toFixed(3) + ")");
        g.addColorStop(1, "rgba(" + b.h + ",0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    // setTimeout-paced (not a 60fps rAF poll that skips most frames) — the main thread only wakes
    // ~24x/sec to draw, instead of 60x/sec to check-and-mostly-skip.
    let timer = 0, raf = 0, running = false;
    function tick() {
      const now = performance.now();
      draw(now * 0.06);
      raf = requestAnimationFrame(() => { timer = window.setTimeout(tick, FRAME_MS); });
    }
    function start() {
      if (running) return;
      running = true;
      tick();
    }
    function stop() {
      running = false;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    }

    resize();
    window.addEventListener("resize", () => { resize(); if (!running) draw(performance.now() * 0.06); });
    // Pause the canvas loop whenever the page isn't actually being looked at — tab hidden AND window
    // blurred (switched to another app/window). Continuously repainting a full-screen blurred canvas
    // in the background is the main battery cost on laptops (notably Safari), and freezing an ambient
    // drift while it's not visible changes nothing the user can see.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop(); else start();
    });
    window.addEventListener("blur", stop);
    window.addEventListener("focus", start);

    draw(0);
    document.documentElement.classList.add("has-aurora");
    requestAnimationFrame(() => {
      canvas.classList.add("is-ready");
      // Release promoted layer once the fade-in settles — persistent will-change costs compositor RAM.
      setTimeout(() => { canvas.style.willChange = "auto"; }, 1600);
    });
    const startLoop = () => {
      if (!running) start();
    };
    // Defer the paint loop until after load/LCP — static first frame + CSS fallback cover the gap.
    if (document.readyState === "complete") {
      if ("requestIdleCallback" in window) requestIdleCallback(startLoop, { timeout: 2500 });
      else setTimeout(startLoop, 1200);
    } else {
      window.addEventListener("load", () => {
        if ("requestIdleCallback" in window) requestIdleCallback(startLoop, { timeout: 2500 });
        else setTimeout(startLoop, 1200);
      }, { once: true });
    }
  }

  window.addEventListener("portfolio-ready", init);
  if (window.__portfolioReady) init();
})();
