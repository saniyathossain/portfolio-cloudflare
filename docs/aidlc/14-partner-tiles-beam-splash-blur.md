# 14 — Partner tile juggle fix + beam on View experience + splash blur-reveal

## 1. Hero partners — fix hover "juggle" + match the "What I build" icon design
- **Cause of the juggle:** the previous partner pill hover-*expanded* its width (grid `0fr→1fr`), which reflowed
  the wrapping row and made siblings jump.
- **Fix:** `.partner-tile` is now a fixed-footprint tile styled exactly like `.service-row__icon` (the "What I build"
  icons) — shiny tinted gradient (`--tint` = hero azure) + tinted rim + inset highlight + soft `--tint` shadow,
  rounded `0.72rem`. Hover only lifts via `transform` (compositor-only → no reflow) + brightens.
- **Name reveal without reflow:** `.partner-tile__name` is an absolutely-positioned tooltip above the tile
  (opacity/transform transition, `pointer-events:none`, `z-index:30`) — the tile footprint never changes, so **no
  juggle**. Keyboard-reachable (`tabindex`, `:focus-visible`, `aria-label`).
- **Per-organisation core colour (not azure/rainbow):** `data.js` `_partnersFromExperience` now maps a real brand
  colour per company slug (Brain Station 23 `#00a0db`, Grameenphone `#19aaf8` — sampled from the logos; icddr,b
  `#c1272d`, Optimum `#1f9e8f`, Runner `#e4022d` — best-effort brand colours, easy to tweak). The tile binds
  `:style="'--tint:' + p.color"`, so each tile's shiny gradient/rim/shadow take that org's colour.
- **Frosted liquid-glass tooltip:** `.partner-tile__name` is now Tahoe frosted glass — translucent white +
  `backdrop-filter: blur(16px) saturate(185%)`, hairline border, inset top highlight + glossy top-sheen gradient
  (the "What I do" icon shine), with a solid `@supports` fallback. Dark ink text stays legible.

## 2. Moving beam on "View experience"
Added the `beam` class (animated conic gradient-border, same as "Get in touch") to the "View experience" CTA
(`index.html`), so both hero buttons share the moving-light animation. Reduced-motion still renders a static ring.

## 3. Splash / loader — smooth blur-reveal motion
- `.loader__content` now blur-reveals: `filter: blur(10px)→blur(0)` alongside opacity/translate (skeleton exits with
  a soft blur too).
- `.loader__panel` gets a gentle `loaderPanelIn` entrance (translate + scale + `blur(7px)→0`).
- All new blur/animation is disabled under `prefers-reduced-motion` (`.loader__content`/`.loader__panel` reset).

## PageSpeed / responsive
- No new network requests (no assets/fonts); no second `backdrop-filter` (the panel sits on the already-blurred
  loader). Blur transitions are brief, GPU-composited, on a non-LCP overlay → **PageSpeed unaffected (web + mobile)**.
- `.partner-tile` is fixed-size and wraps; tooltip is `position:absolute` so it never affects layout at any width.
  `.loader__panel` has a `max-width:640px` padding step. Verify at 360 / 768 / 1024 / 1440.

## Verify
Serve + hard-refresh: partner tiles are shiny (matching "What I build"), hovering lifts a tile and shows the name as
a tooltip with **no row jitter**; both hero CTAs show the moving beam; the splash panel + brand/tagline blur-reveal
in smoothly then slide up. Reduced-motion → static. Lighthouse Perf/SEO/BP/A11y unchanged-or-better.
