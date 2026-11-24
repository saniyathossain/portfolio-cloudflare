# 56 — Liquid layer v2 and section rhythm

**Date:** 2026-11-24 · **Status:** applied (uncommitted until the owner says so)

## Section rhythm (owner: "gaps between sections are too much")
`--sec-py` (padding above and below each `.sec-pad` section, in `styles.css` **and** `critical.css` — they must match or the
page shifts when the full stylesheet arrives) went from `clamp(5rem, 3.4rem + 3.2vw, 7rem)` to
`clamp(3.25rem, 2.5rem + 1.8vw, 4.75rem)`. Content-to-content whitespace (`scripts/measure-gaps.mjs`) dropped by ≈ 30 %:

| width | before (px) | after (px) |
|-------|-------------|------------|
| 360   | 150         | 98         |
| 768   | 151         | 103        |
| 1024  | 174         | 117        |
| 1440  | 201         | 132        |
| 1920  | 224         | 149        |

### Revision — one uniform rule, no seams (owner: "same gap nai", "sections cut")
Final tokens (`styles.css`): `--sec-gap` clamp 3–4.75rem (section→section, identical at every boundary), `--sec-title-gap`
0.75–1.125rem (title→subtitle), `--sec-head-gap` clamp(1.625rem, 1.3rem + 1.1vw, 2.5rem) (subtitle→first card),
`--sec-bleed` 5rem. Layout-measured section gaps (`scripts/measure-gaps.mjs`): 360 → 45, 390 → 48, 768 → 48, 1024 → 55,
1440 → 61, 1920 → 69 px, every boundary within ±2 px.

**Seam cause:** `content-visibility:auto` on #about/#services/#experience/#education implies paint containment, which clips
card shadows at the section box once the section padding was reduced. Fix: each `main > .sec` gets `padding-block:var(--sec-bleed)`
and a compensating negative `margin-top` (`calc(var(--sec-gap) - 2*var(--sec-bleed))`), so shadows paint inside the box and
layout is unchanged; `pointer-events:none` on the section with `auto` on its children keeps the bleed zone click-through.
`contain-intrinsic-size` placeholders were re-measured to the real heights.

## Reference review: onemorethink.dev ("Liquid Glass UI")
That site is a React component library whose glass is **one WebGL2 shader** that really refracts the page behind each
surface, with a plain-CSS fallback when WebGL2 is missing or motion is reduced. Its signature behaviours: buttons that swell
under the pointer and press in, a selection "lens" that magnifies, sliders/switches whose thumb opens into clear glass, popovers
that unfold from their button.

### Already in this site (checked in `styles.css` / `motion.js`, not duplicated)
pointer-tracked specular (`.spec`, `--px/--py`), magnetic buttons, tilt, hero parallax, the nav "droplet" lens, editorial tab
lens, brand-pill FLIP label reveal, `.beam` rim light, `.sheen` sweeps (scroll-driven on touch), menu-button touch bloom, 48 px
frosted nav overlay, 16 px modal backdrop, faux-frost for scrolling glass.

### Adopted (cheap, universal)
- **Spring press-swell** on the controls that had none — experience rows, editorial tabs, back-to-top — using the individual
  `scale` property (composes with existing transforms, compositor-only, skipped by browsers without it, off under
  `prefers-reduced-motion`).
- Slightly deeper frosted backdrop behind the contact modal (22 px blur + saturate), only while open.

### Deliberately **not** adopted
- **A WebGL2 refraction shader / SVG-displacement `backdrop-filter`:** continuous GPU work behind scrolling content, a ~50 KB+
  runtime, Chromium-only for the SVG variant, and a risk to the 98/100 mobile Lighthouse score and low-end phones. The
  reference itself needs a CSS fallback, which is what this site already is.
- `backdrop-filter` on scrolling glass (kept off on purpose, see `--frost-bg`), liquid "neck" morphs, slider/switch lenses
  (no such controls here).

## Compatibility
`scale` (Chrome 104+, Safari 14.1+, Firefox 72+) degrades to no press-swell; `backdrop-filter` is guarded by `@supports` with
the existing tint as fallback; nothing here needs JS. Verified: press state reaches 0.988 / 0.94 / 0.92 and releases to 1
(headless Chrome); gap widths measured at 360–1920 px.
