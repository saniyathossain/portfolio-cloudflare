# 20 — Bismillah calligraphy as the navbar brand mark

## Context
The navbar's left brand was a copper "spark" icon + short name "Saniyat". Replace **both** with the **Bismillah
(Basmala) calligraphy** reused from the sibling project `portfolio-v2`
(`…/portfolio-v2/codes/public/assets/image/bismillah-calligraphy.svg` — 32 vector paths, viewBox
`-8584 0 17168 3372`). Treatment: near-black **ink** with a **subtle copper drop-shadow** (keeps the Tahoe glow the
spark had). **Navbar only** — the loading screen keeps its spark + name.

Inlined (not fetched) to honor the *no new network requests* non-negotiable and match the design system, which
already inlines every SVG icon. The brand button is outside the `<!-- SYNC:* -->` markers, so `sync-head.js` never
rewrites it.

## Changes
### `public/index.html` — brand-btn (line ~95)
Spark `<svg>` + `<span x-text="profile.shortName">` → inlined calligraphy `<svg class="brand-bismillah"
viewBox="-8584 0 17168 3372" fill="currentColor" aria-hidden="true">` (32 paths). Button gains
`aria-label="Mohammad Saniyat Hossain — home"` (accessible name, since the visible text is gone); keeps
`@click="scrollTo('home')"`. Path coordinates rounded 7-decimals → 1 (no-dep Node rounder; svgo not installed):
inner path bytes 28.9KB → 19.6KB, no visible change.

### `public/assets/css/styles.css` — `.brand-bismillah` (near `.brand-btn svg`)
Scoped rule overriding the copper `.brand-btn svg` default:
```css
.brand-btn .brand-bismillah {
  display: block;
  height: clamp(1.3rem, 3.4vw, 1.65rem);
  width: auto;
  max-width: min(9rem, 44vw);   /* never crowds the clock chip + Menu at 360px */
  color: var(--ink);
  filter: drop-shadow(0 1px 6px color-mix(in srgb, var(--accent) 30%, transparent));
}
```
No new Tailwind utilities → no `build-css.sh` run.

## Verify
Serve `public/` → navbar left shows ink calligraphy + copper glow, click scrolls Home. Responsive 360/768/1024/1440:
scales, centered in the glass pill, no overlap with clock/Menu. a11y: button name exposed, SVG `aria-hidden`.
