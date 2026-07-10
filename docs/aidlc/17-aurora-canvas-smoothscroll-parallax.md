# Plan: Aesthetic-motion refinement — aurora canvas, smooth-scroll parallax, Lumora-template fidelity, 100/100

> **Stale note (added in the plan-44 cleanup pass):** the Lenis smooth-scroll proposal below (vendoring
> `vendor/lenis.min.js`, wiring `Lenis({smoothWheel:true})` into `boot.js`/`motion.js`) was implemented and then
> **fully reverted** — see this doc's own later Tranche 2b/2c notes. Neither the vendor file nor any Lenis code
> exists in the repo today; native scroll only, per `docs/aidlc/40` and `docs/aidlc/42`. Kept here as history —
> do not re-add Lenis from this doc's top-level plan.

## Context
The portfolio (Lumora template, restyled as macOS Tahoe liquid glass) already tracks the template's structure —
liquid-reveal hero, hero-card carousel, We/Build/→/Better band, service rows, ink stats panel — and **Tranche 1**
of the full sweep shipped (faux-frost smart glass, solid-copper surname, film-grain). This refinement pushes the
*motion + material* to genuinely extraordinary while holding **Google PageSpeed 100/100 on mobile + web**:

1. The "aurora" today is only a **CSS radial-orb field** (`body::before`) — the user wants a real **aurora gradient
   canvas** (flowing, Apple/Tahoe liquid light).
2. **Parallax is minimal** (one `--aurora-y` drift + hero glow) — the user wants tasteful layered depth + the
   template's smooth-scroll feel.
3. **Service rows** don't do the template's signature **hover-fill**; the hero isn't yet the editorial split.
4. Extraordinary polish overall, blended seamlessly with the Tahoe glass system.

## Decisions (confirmed with user)
- **Aurora:** real **2D-canvas flow aurora** on desktop/fine-pointer (low-res buffer, CSS-blurred, paused when
  hidden, off under reduced-motion) + a **richened CSS aurora fallback** on mobile/reduced-motion → mobile
  Lighthouse never loads the canvas, so **mobile 100/100 is untouched**.
- **Libraries:** may **self-host one small proven lib** — use it for **Lenis smooth-scroll** (the template's
  signature), vendored locally (self-only CSP, no third-party request), **desktop/fine-pointer only** (native
  scroll on touch to protect mobile perf).
- **Parallax:** **tasteful layered depth** — aurora + watermark drift, hero portrait depth, gentle section reveals;
  transform-only, fine-pointer + `!reduced` only.
- (Carried from full sweep) bolder structural reinvention; **smart glass** (real blur only on fixed/sticky
  surfaces); anti-slop: solid-copper surname (done), varied eyebrow cadence, grain + tinted shadows, double-bezel.

## Guiding bar (skills: high-end-visual-design, review-animations, impeccable)
GPU-only motion (`transform`/`opacity` only), sub-300ms UI, hover gated `@media (hover:hover) and (pointer:fine)`,
reduced-motion = gentler-not-zero, IO-only reveals (no scroll-listener layout reads), correct `transform-origin`,
`--ease-glass` (no ease-in entrances). Premium antialiased SF type; one cohesive accent (copper + azure/teal Tahoe);
double-bezel cards; grain + hue-tinted shadows; asymmetry + macro-whitespace; `100dvh`; no AI tells.

---

## Workstreams

### W1 — Aurora gradient canvas (+ rich CSS fallback)  *(the headline)*
- **New `public/assets/js/aurora.js`** (hand-rolled, vendored-local, no dep). A fixed full-viewport
  `<canvas id="auroraCanvas" aria-hidden>` layered **above `body::before`, below content** (z-index ≈ -1).
  Render a **low-res buffer** (buffer width ≈ `min(innerWidth, 640)`, DPR capped at 1 — it's blurred anyway),
  drawing 5–6 large radial "blobs" in the Tahoe palette hues (`#6e6cf0 / #0a84ff / #3fd0e0 / #ff9f0a / #ff5c8a /
  #b15f2c`, desaturated) that **drift on layered sines** over time; composite soft, upscale to viewport with heavy
  CSS `filter: blur(48–64px) saturate(130%)`. rAF loop **throttled ~30fps**, **paused on `visibilitychange`**
  (hidden) — negligible main-thread cost.
- **Gate exactly like `liquid-hero.js`:** load in `boot.js` idle scripts **only when `finePointer && !reduced`**;
  `aurora.js` also self-guards. Mobile/reduced-motion never loads it.
- **Richen the CSS aurora** (`body::before`) — it's the mobile baseline + pre-canvas paint: add a conic mesh layer
  + subtle hue drift, still pure CSS (zero JS). Canvas sits on top when present; identical palette so no seam.
- Parallax offset: `aurora.js`/`motion.js` translate the canvas a few px on scroll (transform-only).

### W2 — Smooth-scroll + tasteful parallax
- **Vendor Lenis locally** → `public/assets/js/vendor/lenis.min.js` (download once; **no CDN/importmap** — keeps
  CSP `self`-only). Load in `boot.js` idle **only when `finePointer && !reduced`**: `new Lenis({ smoothWheel:true })`
  + rAF loop. **Wire scroll-lock:** the existing modal/nav/loader lock (Alpine in `app.js`) must call
  `lenis.stop()/start()` (or a shared `stopScroll/startScroll`) so overlays don't scroll-bleed. Keep the existing
  `scrollTo()` behavior working through Lenis. Touch = native scroll (unchanged).
- **Extend `motion.js` parallax** (reuse the existing throttled `auroraParallax` rAF): one scroll handler writes a
  few CSS vars consumed as `transform` on — hero watermark `.hero__wm` (slow drift), hero portrait
  `#heroLiquid`/`.hero__backdrop` (subtle depth), `#heroGlow` (exists), aurora canvas. Magnitudes small (≤ ~40px);
  **IO-gate to run only while the hero is in view**; fine-pointer + `!reduced` only. Optional `[data-parallax]`
  section elements (transform-only, IO-driven). No `width/height/top/left` animation anywhere.

### W3 — Lumora-template fidelity restyle
- **Service rows → template hover-fill:** restyle `.service-row` to the template pattern — row fills `--surface`
  on hover, `padding-left` grows, trailing arrow badge `translateX`, leading index cell — kept inside the
  **faux-frost** panel (no `backdrop-filter`), hover gated `@media (hover:hover) and (pointer:fine)`, reduced-motion
  instant. Keep the shiny `--tint` icon tiles.
- **Hero editorial split** (full-sweep Phase 4): asymmetric oversized headline left / layered glass aside right with
  intentional overlap + depth; keep the liquid portrait + watermark; eyebrow stays as the one deliberate kicker;
  double-bezel hero-card. Restage the carousel + create-band polish to match the template's spring feel.
- **Vary eyebrow cadence** across sections (kicker only where deliberate — drop the reflexive ones).

### W4 — Motion pass (review-animations bar)
- Rework `.brand-pill`/label reveals off any layout prop (`grid-template-columns`) to `transform`/`clip-path`.
- Confirm all hover springs gated to fine-pointer; specular + parallax gated to fine-pointer/desktop; asymmetric
  enter/exit; reduced-motion keeps opacity/colour, drops movement.

### W5 — Mobile + PageSpeed 100/100 + audit
- `100dvh` not `vh`; asymmetric layouts collapse to single column < 768px; drop overlaps/rotations on mobile;
  faux-frost (no blur) on all scrolling glass. Verify **360 / 390 / 768 / 1024 / 1440** — no overflow/clipping, tap
  targets ≥ 44px.
- **Lighthouse mobile AND desktop → 100** across Perf/A11y/BP/SEO. Aurora canvas + Lenis are desktop-gated, so
  mobile is structurally protected; still verify. Then run **impeccable audit** + **review-animations** over the
  diff; fix findings.

---

## Constraints (bake in)
No inline `style=""` (Alpine `:style` / `el.style` only); **`portfolio.json` single content source** via `data.js`
(no fabrication); `<head>` via `node scripts/sync-head.js` (don't edit inside SYNC markers); `./build-css.sh` **only**
if new Tailwind utilities are added (prefer custom classes + tokens); **CSP/Worker (`src/index.js`) intact —
`self`-only, no third-party requests** (Lenis + aurora.js are self-hosted); light-only; every animation
reduced-motion-gated; a11y AA (≥ 4.5:1).

## Files
- `public/assets/js/aurora.js` — **new**, canvas flow aurora (idle-loaded, fine-pointer + `!reduced`).
- `public/assets/js/vendor/lenis.min.js` — **new**, vendored smooth-scroll (self-hosted).
- `public/assets/js/boot.js` — load aurora.js + lenis in the gated idle set.
- `public/assets/js/motion.js` — extend `auroraParallax` into the tasteful multi-layer parallax; init Lenis + rAF.
- `public/assets/js/app.js` — wire modal/nav/loader scroll-lock to `lenis.stop()/start()`.
- `public/assets/css/styles.css` — richen `body::before` aurora; `#auroraCanvas` layer; `.service-row` hover-fill;
  hero editorial-split + double-bezel; parallax transform hooks; eyebrow cadence.
- `public/index.html` — add `<canvas id="auroraCanvas">`; hero split markup; `[data-parallax]` hooks.
- `docs/aidlc/17-aurora-canvas-smoothscroll-parallax.md` — this doc.

## Verification
1. Serve `npx wrangler dev` (or `python3 -m http.server 8080 --directory public`); hard-refresh (⌘⇧R).
2. **Desktop:** aurora canvas flows softly at ~30fps (paused when tab hidden); Lenis smooth-scroll feels buttery;
   parallax layers drift subtly with no jank/repaint storms (DevTools Performance → 60fps, no layout thrash).
3. **Mobile / reduced-motion:** canvas + Lenis absent (rich CSS aurora only, native scroll); off-state fully
   visible; hover effects only on fine-pointer.
4. **Lighthouse mobile AND desktop → 100** on Performance/Accessibility/Best-Practices/SEO; **no new network
   requests** (Lenis self-hosted), no CSP violations, CLS≈0, LCP good.
5. Responsive 360/390/768/1024/1440 — clean collapse, no overflow/clipping, tap targets ok.
6. Craft: `impeccable audit` + `review-animations` over the diff — no AI tells, no feel-breaking regressions,
   contrast AA; CSS braces balanced; no inline styles.

---

## DONE (changelog)
- **Tranche 2c (reconcile — keep aurora, drop Lenis)** — Re-added the **canvas flow aurora** (`aurora.js`,
  self-injected `#auroraCanvas`, gated `finePointer && !reduced`, ~30fps, paused on `visibilitychange`) since it was
  not the freeze cause and is the requested headline. **Lenis stays out** (it was the scroll-lock/wheel-freeze
  culprit): no `initLenis`, no `__lenis` scroll-lock/scrollTo wiring, vendored `lenis.min.js` deleted. CSS aurora
  fallback + hero parallax retained. Native scroll everywhere.
- **Tranche 2b (scroll/perf fix)** — Removed Lenis + canvas aurora (scroll lock + triple rAF caused wheel freeze and jank); loader now unlocks scroll before `portfolio-ready`; brand-pill grid reveal restored; CSS aurora + hero parallax kept.
- **Tranche 2 (doc 17)** — Canvas flow aurora (`aurora.js`), richened CSS aurora fallback, self-hosted Lenis smooth-scroll (desktop/fine-pointer), layered hero parallax, Lumora service-row hover-fill + index cell, hero editorial split + double-bezel card, brand-pill clip-path reveals, eyebrow cadence trim (Services/Experience/Skills/Education), `100dvh` hero. (Partially reverted in 2b — see above.)
- **Tranche 1 (full-sweep Phase 1–2 backbone)** — smart-glass faux-frost on scrolling cards (`--frost-bg`, no
  `backdrop-filter`; real blur retained on fixed chrome), hero surname solid copper (dropped `background-clip:text`),
  fixed `pointer-events:none` film-grain overlay (inline data-URI noise, no network). (Shipped.)
- **Agent context + `.gitignore` + partner-pill revert** (doc 15) — partners = `.partner-pill`; project `CLAUDE.md`.
- Earlier passes (docs 06–14): Tahoe motion/material base, photo-driven palette, `[data-ci]` cards, SF-Pro + shiny
  chips, per-designation colours, hero loader/watermark/subtitles + clean-ink+copper name + check-chip markers,
  beam CTAs + frosted loader splash. (All shipped — this refinement builds on them.)
