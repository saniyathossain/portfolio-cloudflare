# 12 — Hero "Worked with" partner pills + designation eyebrow

Polish pass on two hero details after the doc-11 hero refresh.

## Problem
- **Partner pills didn't emerge.** The "Worked with" partners use `.brand-pill--partner` — icon-only glossy
  circles that hide the company name until hover. Every pill's colour came from
  `:style="'--brand:' + (p.color || '#6b6b6b')"`, and partners carry **no `color`** in `portfolio.json`, so all
  pills fell back to dull **grey** — no shine, no pop.
- **Hero designation eyebrow** ("Staff Software Engineer · Dhaka, Bangladesh") stacked an icon-chip + dot + azure
  text — busier than the Lumora template's clean dot + text, and not tuned to complement the copper surname.

## Decisions (confirmed with user)
- **Partners:** keep the icon-only → hover-reveal pill pattern, but make each a genuinely **shiny, colourful
  glossy logo chip** that blends with the "What I build" `.service-row__icon` shine.
- **Eyebrow:** **minimal dot + warm-beige text**, drop the icon-chip, aligned to the template.

## Changes
### Partner "Worked with" strip (`public/index.html`, `public/assets/css/styles.css`)
The colourful glossy hover-reveal pill (and the earlier palette-tinted attempt) read as random coloured dots that
clashed with the real brand logos. **Final design = a minimal neutral logo strip** (template "Trusted by" vibe):
- Markup: each partner is a plain `.partner-tile` = `<span :title="p.name"><img :src="p.logo" :alt="p.name"></span>`
  — name via `alt` (screen readers) + `title` (hover tooltip); non-interactive; no tint, no inline name, no `--brand`.
- CSS: `.partner-tile` reuses the neutral `.edu-row__logo` material (white gradient + hairline + inset highlight +
  soft neutral shadow), `2.5rem` square, logo `1.5rem`/`object-fit:contain`; hover lifts the tile. The real logos
  provide their own colour. `.hero-partners__list` is a tidy wrapping flex row (no horizontal scroll).

### Hero eyebrow (`public/index.html`, `public/assets/css/styles.css`)
- Dropped the icon-chip span (hero only; section eyebrows keep theirs).
- New token `--beige: #7f6a49` (warm taupe-beige, AA ≈ 4.7:1 on the light hero, harmonises with copper `--accent`).
- Scoped `#home .eyebrow { color: var(--beige); font-weight:600; letter-spacing:0.14em; }` +
  `#home .eyebrow-dot { background: var(--beige); }`. The over-portrait white state is preserved with a
  higher-specificity `#home .hero__copy--on-dark .eyebrow` override (id selector needed to beat `#home .eyebrow`).

## Constraints honoured
- No inline `style=""` (partner `--brand` via Alpine `:style`); custom classes + tokens only → **no Tailwind rebuild**.
- No new network requests; CSP/Worker untouched; light-only; `portfolio.json` single source. Reduced-motion +
  360/768/1024/1440 responsive preserved; AA verified on beige.

## Verify
Serve (`npx wrangler dev` / `python3 -m http.server 8080 --directory public`), hard-refresh (⌘⇧R):
- Partners render as colourful glossy logo chips (distinct hues), logos evenly sized, clean circle collapse; hover
  reveals the name + brand glow; blends with the Services tiles.
- Eyebrow reads "• Staff Software Engineer · Dhaka, Bangladesh" in warm beige, no icon-chip; legible on light and
  when it flips to on-dark over the portrait.
- Lighthouse Performance/SEO/Best-Practices/A11y unchanged-or-better; no new requests; no CSP violations.
