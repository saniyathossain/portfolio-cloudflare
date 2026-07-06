# 22 — PageSpeed 100 (mobile + web) + favicon silhouette redesign

Source: two local Lighthouse runs supplied by the user —
`../google-pagespeed-reports/localhost_8080-20260703T154506.json` (desktop, **92**) and
`localhost_8080-20260703T154823.json` (mobile, **60**). Findings below are read directly from those
reports, not guessed.

## Findings (ranked by impact)

### Mobile — Performance 60/100 (the real target)
1. **LCP 9.2s, score 0.01 — critical.** The hero `<img id="heroBaseImg">`
   (`saniyat-hossain.webp`) is served at its full master resolution: **3000×4000px, 644 KB**, into a
   box that renders at **824×1099 CSS px**. Lighthouse's own `image-delivery-insight` audit reports
   **539 KB wasted** on this one request. This single file is the dominant cause of the 9.2s LCP —
   on throttled mobile (slow 4G + 4× CPU throttle) a 644 KB image blocks the LCP paint outright. Root
   cause: `optimize-images.js`'s `webp()` step only re-encodes format (`cwebp -q 82`), it never
   resizes — the "immutable master, never mutate in place" fix from commit `92bb303` correctly killed
   the old generation-loss bug but as a side effect also dropped the resize step that used to exist,
   so the derivative is now full-resolution.
2. **Render-blocking requests, 880ms wasted.** `styles.min.css?v=uplift-2` (74.8 KB, 905ms) and
   `tailwind.css` (12.4 KB, 305ms) both block first paint. Two separate blocking stylesheet requests
   in sequence, most of whose rules (all section styles, all component states) aren't needed for the
   above-the-fold hero.
3. **Total Blocking Time 440ms / TTI 9.2s / Max Potential FID 290ms** — largely downstream of #1
   (the browser is busy decoding a 3000×4000 image) plus `mainthread-work-breakdown` (7.2s under
   4× CPU throttle).
4. Minor: `unminified-css`/`unminified-javascript` (8–12 KB each), `unused-javascript` (21 KB),
   `unused-css-rules` (25 KB), `document-latency-insight` (24 KB).

### Desktop — Performance 92/100
Same shape, smaller magnitude: LCP 1.7s (score 0.74, still the single biggest score loss),
`unused-css-rules` (24 KB), `unminified-css` (8 KB), `unused-javascript` (75 KB — desktop loads
`motion.min.js`/`liquid-hero.js`/`aurora.js` on idle which mobile skips, so more bytes are "unused"
on a single-load audit; this is intentional fine-pointer gating, not a bug).

### `cache-insight` (both runs, ~1.4–1.5 MB "inefficient cache lifetimes") — **not a real issue**
`src/index.js` already sets `Cache-Control: public, max-age=31536000, immutable` on every
`/assets/*` response. This flag only fires when Lighthouse is pointed at a bare static file server on
`localhost:8080` that doesn't run the Worker's header logic. **Action: no code change — note this in
the doc and tell the user to test via `wrangler dev` (or the deployed preview) for an accurate score.**

### Favicon — user feedback: "didn't like the design much"
`faviconSvg()` embeds the *raw* portrait, resized to 160px on its long edge, into a 100×100 SVG
`viewBox` with `preserveAspectRatio="xMidYMin slice"` (top-aligned crop) and a squircle clip. At 16–32
tab-icon size this reads as indistinct photographic noise — expected, since the source is a 3000×4000
environmental portrait (sky + sea fill most of the frame) with the head occupying a small, off-center
fraction. Top-aligned cropping also cuts awkwardly through the hair, not the face.

## Decisions (confirmed with user)

- **Favicon: keep the photo, fix the crop, add a silhouette/duotone treatment** (option 3, refined).
  Not a monogram. Two concrete asks: (a) proper face-centered crop, (b) an aesthetic "silhouette
  effect."
- Implementation for (b): since there's no background-removal tool in this pipeline (no
  rembg/AI matting, offline), a literal cutout silhouette isn't reliably achievable. Using a
  **duotone map** instead — grayscale → contrast level → 2-color gradient (`ink` shadows →
  `copper/cream` highlights, matching the site's existing accent palette) via ImageMagick's
  `+level-colors`. This produces a bold, poster-like, high-contrast portrait where the hair/beard/
  sunglasses mass reads as a dark silhouette against a warm light ground — legible at 16px, distinct
  from a plain photo, on-brand with the copper ring already used. Applied uniformly across
  favicon.svg, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png so the same person is
  recognizable at every size instead of switching styles between tab icon and home-screen icon.
- Crop rectangle (face-centered, computed from visual inspection of the 3000×4000 master — head
  center is left-of-frame-center, profile facing right): **square crop starting at 6.7% width /
  13% height, spanning 69% width / 52% height** of the source (in pixels on the 3000×4000 master:
  `x=200 y=520 w=2080 h=2080`). Captures full hair, face, beard, with even margin.
- Needs ImageMagick (`magick` or legacy `convert`) for exact `-crop WxH+X+Y` — sips has no
  documented reliable arbitrary-offset crop, only centered `-c`. `optimize-images.js` already has a
  `has("magick")` fallback path from the existing code; extending it. If magick isn't installed on
  the Mac this runs on: `brew install imagemagick`.

## Tranches

### Tranche A — Mobile LCP fix (the one that matters most)
1. Rewrite `optimize-images.js` hero pipeline to emit a **responsive srcset**, not one full-res file:
   widths `480, 900, 1300, 1800` (px, long edge sized to cover mobile 1x/2x and desktop 62vw at 2x),
   each re-encoded from the immutable master via `cwebp`, all governed by the existing content-hash
   cache (`needsGen`/`record`) — no change to the idempotency guarantee.
2. Update `public/index.html` hero `<picture>`: `srcset`/`sizes` on both the `<source type="webp">`
   and the `<img>` fallback; keep `fetchpriority="high"` + `decoding="async"`; keep intrinsic
   `width`/`height` matching the largest generated variant's aspect ratio (3:4) so CLS stays ~0.
3. Update `EARLY_HINTS` in `src/index.js` and the preload `<link>` built in `scripts/sync-head.js` to
   point at the smallest mobile-appropriate variant (480w) rather than the full webp, since Early
   Hints/preload can't express `srcset` — the browser will still upgrade to the right size once it
   parses the real `<img>` tag, but the preload no longer forces a 644 KB download before first paint.
4. Same srcset treatment is *not* needed for `og-image.jpg` (never rendered on-page, only read by
   social crawlers) — leave as-is.

### Tranche B — Render-blocking CSS
5. Split a small hand-authored **critical CSS** block (root tokens, `body`, header/nav, `.hero*`,
   loader) and inline it directly in `<head>` (generated by `scripts/sync-head.js` from a new
   `public/assets/css/critical.css` source file, so it stays hand-maintained but auto-synced into the
   HTML like the rest of `<head>`).
6. Load the full `styles.min.css` non-blocking: `<link rel="stylesheet" href="..." media="print"
   onload="this.media='all'">` + `<noscript>` fallback — standard non-blocking-CSS pattern, zero new
   network requests, no JS framework needed.
7. Evaluate folding `tailwind.css` (109 selectors, 12 KB) into `styles.min.css` at build time
   (`build.sh` already runs `minify-css.js` right after `build-css.sh` — concatenate before minifying)
   to remove the second render-blocking request entirely. Confirm no specificity/ordering conflicts
   before finalizing.

### Tranche C — Minify/unused trim (secondary, small savings)
8. Add a minimal JS minifier pass (comment/whitespace strip, same conservative approach as
   `minify-css.js` — no AST tooling, no npm dependency) for `app.js`/`boot.js`/`data.js`/`icons.js`
   or confirm the byte savings (12 KB) don't justify the added build complexity — decide after
   Tranche A/B numbers are in, since LCP dominates the score.
9. Re-check `unused-css-rules` after Tranche B's critical-CSS split — inlining critical CSS separately
   from the full stylesheet naturally reduces what's "unused" during the LCP window.

### Tranche D — Favicon redesign
10. Extend `optimize-images.js`: `has("magick")` crop step using the computed face-centered rectangle,
    then a duotone pass (`-colorspace Gray -level 12%,88% +level-colors "<ink>,<copper-cream>"` —
    exact hex values pulled from `styles.css` `--ink`/accent tokens so it matches the live palette,
    not hardcoded separately).
11. Re-generate `favicon.svg` (squircle mask + copper ring, same geometry as today, new duotone
    source image, corrected crop/aspect so `preserveAspectRatio` no longer needs a lossy top-crop),
    `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` — all from the same
    duotone crop for visual consistency between tab icon and home-screen icon.

### Tranche E — Aesthetic type refinements (from earlier fine-tuning ask, folded in)
12. `.sec-sub` (section subtitles): bump `clamp(1rem, 1.45vw, 1.125rem)` → `clamp(1.0625rem, 1.6vw,
    1.25rem)` (~10–12% larger).
13. Base body/description text (`.service-row__desc`, `.exp-row__desc`, `.edu-row__degree`, etc.,
    currently clustered at `0.875rem`): bump to `0.9375rem` where used as primary reading copy (not
    badges/labels, which stay small intentionally).
14. Extend the existing `--text-sh-tint` colored-shadow treatment (already used on a few labels) to
    section subtitles and hero copy for more "designed" depth; keep all text-shadow tokens as CSS
    custom properties (no new ones needed, just wider application).
15. `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;` — verify present
    globally (audit during execution), add if missing.

## Guardrails (unchanged from prior tranches)
No new network requests. No `backdrop-filter` outside fixed chrome. Every animation gated by
`prefers-reduced-motion`. Responsive check at 360/768/1024/1440. `styles.css` stays the hand-authored
source of truth; `styles.min.css` stays generated-only (never hand-edited). All image pipeline changes
stay inside the existing content-hash cache (`'.img-cache.json'`) so `build.sh` remains a no-op on a
clean tree.

## Execution order
A (mobile LCP — highest score impact) → B (render-blocking CSS) → D (favicon, user-visible, independent
of A/B) → E (type polish) → C (minify trim, do last, smallest and most mechanical).
