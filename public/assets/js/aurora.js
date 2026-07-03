/** Aurora gradient canvas — flowing Tahoe liquid-light field.
 *  Desktop/fine-pointer + no-reduced-motion only (gated by boot.js and self-guarded).
 *  Low-res buffer (blurred + upscaled via CSS), ~30fps, paused when the tab is hidden. */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;

  // Desaturated Tahoe palette blobs. Each drifts on its own layered sines.
  const BLOBS = [
    { h: "110,108,240", ax: 0.16, ay: 0.10, sx: 0.011, sy: 0.017, ph: 0.0, x: 0.14, y: 0.08, r: 0.62 },
    { h: "10,132,255",  ax: 0.14, ay: 0.12, sx: 0.013, sy: 0.009, ph: 1.7, x: 0.86, y: 0.06, r: 0.58 },
    { h: "63,208,224",  ax: 0.18, ay: 0.14, sx: 0.008, sy: 0.015, ph: 3.1, x: 0.82, y: 0.84, r: 0.66 },
    { h: "255,159,10",  ax: 0.15, ay: 0.11, sx: 0.015, sy: 0.011, ph: 4.4, x: 0.08, y: 0.90, r: 0.60 },
    { h: "255,92,138",  ax: 0.20, ay: 0.16, sx: 0.010, sy: 0.013, ph: 5.6, x: 0.48, y: 0.48, r: 0.52 },
    { h: "177,95,44",   ax: 0.13, ay: 0.12, sx: 0.012, sy: 0.010, ph: 2.3, x: 0.72, y: 0.36, r: 0.50 },
  ];
  const FRAME_MS = 33; // ~30fps

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
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, "rgba(" + b.h + ",0.55)");
        g.addColorStop(0.5, "rgba(" + b.h + ",0.22)");
        g.addColorStop(1, "rgba(" + b.h + ",0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    let raf = 0, last = 0, running = false;
    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      draw(now * 0.06);
    }
    function start() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    resize();
    window.addEventListener("resize", () => { resize(); if (!running) draw(performance.now() * 0.06); });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop(); else start();
    });

    draw(0);
    requestAnimationFrame(() => canvas.classList.add("is-ready"));
    start();
  }

  window.addEventListener("portfolio-ready", init);
  if (window.__portfolioReady) init();
})();
