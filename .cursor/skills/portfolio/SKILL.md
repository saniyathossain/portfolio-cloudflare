---
name: portfolio
description: Extend, build, and deploy the Saniyat static portfolio (Lumora + Tahoe liquid glass, Cloudflare Workers). Use when editing sections, content, CSS, loader, pills/chips, or deployment.
---

# Portfolio Site Skill

**Live:** https://saniyat.com

## Stack

| Layer | Location |
|-------|----------|
| Deploy root | `public/` (Wrangler static assets) |
| Worker + CSP | `src/index.js` |
| Content JSON | `public/assets/data/portfolio.json` |
| Content loader | `public/assets/js/data.js` → `window.portfolioDataReady` |
| Alpine app | `public/assets/js/app.js` (loaded by `boot.js`) |
| Design system | `public/assets/css/styles.css` |
| Tailwind utilities | `public/assets/css/tailwind.css` (prebuilt) |
| Service worker | `public/sw.js` |

**Boot order:** `data.js` → `icons.js` → `loader.js` → `boot.js` → `app.js` + Alpine → `reveal.js` / `blur-reveal.js` → idle: `motion.js`, and (desktop/fine-pointer only) `liquid-hero.js` + `aurora.js`.

## Build & deploy

```bash
./build.sh          # CSS, fonts, images, sync-head, SW hash
npx wrangler dev    # local preview
./deploy.sh         # production
```

- Run `./build-css.sh` only when adding new Tailwind classes to HTML.
- After changing `site` / `profile` in JSON, run `node scripts/sync-head.js` (do not hand-edit `<!-- SYNC:HEAD -->` / `<!-- SYNC:H1 -->` blocks).
- Bump `?v=` query params on CSS/JS in `index.html` and `boot.js` when cache busting loader or SW-sensitive assets.

## Content rules

- **Single source:** `portfolio.json` → `data.js`. CV truth: `docs/cv-modern-template.md`.
- **Section subtitles:** `portfolio.json` → `sections` map; applied via `data-sec-sub` + `_applySectionSubs()` (not Alpine-bound).
- **Experience:** Brain Station 23 = four roles in `experienceGroups`; each role has `stacks[]`, `aiTools[]`, own `toggleRole(id)`.
- **Brand pills:** `brandOf(name)` → colour + icon; extend `PORTFOLIO_DATA.brands` and add SVG under `public/assets/img/brands/`.
- **Partners:** sorted by recency in `_partnersFromExperience()`; hero uses `.partner-pill` (logo + label, frosted pill — not icon-only tiles).

## Design system (current)

- **Fonts:** SF Pro system stack first; self-hosted Inter fallback in `public/assets/fonts/`.
- **Palette:** Lumora beige `--surface #f1f0ee`, copper `--accent`, azure `--primary` from portrait; per-section `--tint` / `--tint-deep`; `[data-ci]` hue map on list rows.
- **Glass:** `.glass-panel`, `.glass-card`, `.hero-card` — `backdrop-filter` + `--glass-blur*` tokens.
- **Shiny chips:** `.icon-chip`, `.service-row__icon`, `.exp-row__icon`, `.point-chip` — tinted gradient fill + inset highlight + soft `--tint` shadow + diagonal `::before` gloss. **Do not** replace with neutral backdrop-filter-only “liquid glass” layers (user rejected).
- **Brand pills:** `.brand-pill` — gradient surface, brand-coloured mono badge, sheen sweep `::before`, `.spec` pointer glow; stack/AI variants `--stack` / `--ai`.
- **Loader:** `html.is-loading` blurs `#app` via inline critical CSS + `loader.js`; splash uses `.loader` backdrop blur; gates `html.is-ready` for hero watermark / header.
- **Motion:** `[data-reveal]`, `.blur-reveal`, aurora (CSS `body::before` fallback + real canvas field in `aurora.js`, desktop/fine-pointer; whisper-rebalanced + sun-glare, see `18-…`), native scroll + lightweight hero parallax in `motion.js`; `liquid-hero.js` desktop only; `prefers-reduced-motion` gates everywhere.

## HTML / CSS conventions

- No inline `style=""` on static markup; Alpine `:style` / `:class` OK for dynamic binds.
- Custom components live in `styles.css`; avoid one-off experiments that fight the shiny-chip language.
- No `eval` / `new Function` in production JS.
- Legacy site in `legacy/` — do not extend.

## Adding a section

1. Markup in `public/index.html`: `.sec`, `.shell`, `[data-reveal]`, optional `data-sec-sub`.
2. Styles in `public/assets/css/styles.css`; set section `--tint` override if needed (`#about`, `#services`, …).
3. Tailwind utilities only if needed → `./build-css.sh`.

## Docs & skills

- **Architecture / history:** `docs/aidlc/` (00–18), especially `01-design-system.md`, `05-redesign-liquid-glass.md`, `08-cloudflare-deploy.md`, `17-aurora-canvas-smoothscroll-parallax.md`, `18-signature-uplift-whisper-aurora-motion.md`.
- **Design taste (installed):** `.agents/skills/` + `skills-lock.json` — use for large visual passes, not for overriding established chip/pill patterns above.
- **PageSpeed / SEO / PWA:** `docs/aidlc/07-pagespeed-seo-pwa-plan.md` — keep CSP, no new runtime network deps, SW network-first for `/assets/js/*` and `/assets/css/*`.

## Checklist before deploy

- [ ] `./build.sh` if head/Tailwind/images changed
- [ ] Hard refresh / SW update path verified for loader + CSS
- [ ] Responsive spot-check: 360 / 768 / 1024 / 1440
- [ ] `prefers-reduced-motion` still disables animations
