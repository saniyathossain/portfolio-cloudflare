/**
 * Hero liquid cursor-reveal canvas (Lumora after base + before brush).
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;

  const BRUSH_FRACTION = 0.34;
  const DECAY = 0.016;
  const IDLE_MAX = 120;

  function readObjectPosition(img) {
    const raw = getComputedStyle(img).objectPosition.trim().split(/\s+/);
    const px = parseFloat(raw[0]);
    const py = parseFloat(raw[1] || raw[0]);
    return {
      x: Number.isFinite(px) ? px / 100 : 0.5,
      y: Number.isFinite(py) ? py / 100 : 0.5,
    };
  }

  function init() {
    const container = document.getElementById("heroLiquid");
    const baseImg = document.getElementById("heroBaseImg");
    const brushImg = document.getElementById("heroBrushImg");
    const canvas = document.getElementById("heroCanvas");
    if (!container || !baseImg || !brushImg || !canvas) return;
    // Loaded lazily here (not a static <img src>) so mobile/no-JS/reduced-motion loads never pay
    // for this desktop-only brush asset — reuses the largest hero webp variant, no extra file.
    if (!brushImg.src) brushImg.src = "/assets/img/saniyat-hossain-1800.webp";

    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cover = null;
    let brush = null;
    let radius = 0;
    let points = [];
    let last = null;
    let idle = 0;
    let drawing = false;
    let raf = 0;
    let imgPos = { x: 0.5, y: 0.12 };

    function sizeCanvas() {
      const r = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      canvas.style.width = r.width + "px";
      canvas.style.height = r.height + "px";
      radius = Math.min(r.width, r.height) * BRUSH_FRACTION * dpr;
      cover = document.createElement("canvas");
      cover.width = canvas.width;
      cover.height = canvas.height;
      brush = document.createElement("canvas");
      const diam = Math.ceil(radius * 2);
      brush.width = diam;
      brush.height = diam;
      imgPos = readObjectPosition(baseImg);
      drawCover();
    }

    function drawCover() {
      if (!cover) return;
      const cctx = cover.getContext("2d");
      cctx.clearRect(0, 0, cover.width, cover.height);
      const src = brushImg.complete && brushImg.naturalWidth ? brushImg : baseImg;
      if (!src.complete || !src.naturalWidth) return;
      const iw = src.naturalWidth;
      const ih = src.naturalHeight;
      const scale = Math.max(cover.width / iw, cover.height / ih);
      const sw = iw * scale;
      const sh = ih * scale;
      const sx = (cover.width - sw) * imgPos.x;
      const sy = (cover.height - sh) * imgPos.y;
      cctx.filter = "saturate(1.25) contrast(1.06) brightness(1.03)";
      cctx.drawImage(src, sx, sy, sw, sh);
      cctx.filter = "none";
    }

    function stamp(x, y) {
      const bctx = brush.getContext("2d");
      const diam = brush.width;
      const c = radius;
      bctx.clearRect(0, 0, diam, diam);
      const g = bctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.55, "rgba(255,255,255,0.82)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      bctx.fillStyle = g;
      bctx.fillRect(0, 0, diam, diam);
      bctx.globalCompositeOperation = "source-in";
      bctx.drawImage(cover, x - c, y - c, diam, diam, 0, 0, diam, diam);
      bctx.globalCompositeOperation = "source-over";
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(brush, x - c, y - c);
    }

    function tick() {
      if (points.length) {
        idle = 0;
        drawing = true;
      } else {
        idle++;
        drawing = false;
      }
      if (idle > IDLE_MAX && !points.length) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        raf = 0; // fully idle — stop the loop (restarts on the next pointer move) so we don't burn frames
        return;
      }
      const fade = drawing ? DECAY : Math.min(DECAY + idle * 0.004, 0.5);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0," + fade + ")";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      if (points.length) {
        for (const p of points) stamp(p.x, p.y);
        points = [];
      }
      raf = requestAnimationFrame(tick);
    }

    function queuePoint(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      const x = (clientX - r.left) * dpr;
      const y = (clientY - r.top) * dpr;
      if (x < -radius || y < -radius || x > canvas.width + radius || y > canvas.height + radius) {
        last = null;
        return;
      }
      if (!last) {
        last = { x, y };
        points.push({ x, y });
        return;
      }
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.hypot(dx, dy);
      const step = Math.max(radius * 0.3, 1);
      const n = Math.min(Math.ceil(dist / step), 60);
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        points.push({ x: last.x + dx * t, y: last.y + dy * t });
      }
      last = { x, y };
    }

    function onPointerMove(e) {
      queuePoint(e.clientX, e.clientY);
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function onPointerDown(e) {
      last = null;
      queuePoint(e.clientX, e.clientY);
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function onPointerLeave() {
      last = null;
    }

    function onImagesReady() {
      imgPos = readObjectPosition(baseImg);
      drawCover();
    }

    baseImg.addEventListener("load", onImagesReady);
    brushImg.addEventListener("load", onImagesReady);
    if (baseImg.complete && brushImg.complete) onImagesReady();
    sizeCanvas();
    new ResizeObserver(sizeCanvas).observe(container);
    container.addEventListener("pointermove", onPointerMove, { passive: true });
    container.addEventListener("pointerdown", onPointerDown, { passive: true });
    container.addEventListener("pointerleave", onPointerLeave);
  }

  window.addEventListener("portfolio-ready", init);
  if (window.__portfolioReady) init();
})();
