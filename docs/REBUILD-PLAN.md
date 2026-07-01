# Saniyat Portfolio Rebuild (Lumora base + portfolio-v2 content, Cloudflare Workers)

> Reference copy of the implementation plan. Live site: **https://saniyat.com**

## Goal
Replace the dc-runtime site with a clean, static, standards-compliant portfolio that:
- Uses the **Lumora design system** as the base template (palette, adaptive rem grid, loader, watermark, spring reveals, liquid hero).
- Fills it with **Saniyat's real content + assets** from `portfolio-v2` seed data.
- Has **zero inline CSS**, separate CSS/JS files, precompiled Tailwind, Alpine.js + Motion One (vendored, no node_modules).
- Runs on **Cloudflare Workers (Static Assets)**.

## Architecture
- `public/` — deploy root
- `src/index.js` — Worker security headers
- `wrangler.toml` — Cloudflare config
- `build-css.sh` — Tailwind standalone CLI build

## Key decisions
- Deliverable: **Saniyat's portfolio**; Lumora = design template only.
- Full static rewrite; drop dc-runtime.
- Tailwind precompiled via standalone CLI (no npm/node_modules at runtime).
- Hosting: Workers with Static Assets.

## Sections (DOM order)
PageLoader → Header → Hero → About → CreateBand → Portfolio → **Services** → Experience → Skills → Stats → Education → Footer → NavMenu → RequestModal

## Design system
- Palette: `#ffffff #111111 #0a0a0a #8d8d8d #b6b6b6 #e6e5e2 #f1f0ee #e3e2df` accent `#b15f2c` (`#cf8047`/`#97501f`)
- Fonts: Inter + SF Pro system stack
- Adaptive rem grid + spring reveals + glass header

## Content source
`portfolio-v2` seeds → `public/assets/js/data.js`

## Compliance
SEO, PageSpeed, security headers, ThemeForest structure

## Out of scope
Real form backend, i18n, dark mode, admin

See also: `docs/aidlc/` for detailed design system and gap analysis.
