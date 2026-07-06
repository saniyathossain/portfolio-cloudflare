# Architecture

```
Browser → Cloudflare Worker (src/index.js)
       → Static Assets (public/)
       → index.html + CSS + JS + images
       → portfolio.json (fetch) → data.js → Alpine app
```

## Boot sequence
1. `data.js` — fetch `/assets/data/portfolio.json`, expose `window.portfolioDataReady`
2. `loader.js` — splash 000→100, progressive blur on `#app`, sets `html.is-ready`
3. `boot.js` — register SW, load `app.js` + Alpine, then `reveal.js` / `blur-reveal.js`, idle `motion.js` / `liquid-hero.js`

## Security
- CSP, HSTS, X-Frame-Options via Worker
- Cache headers via `public/_headers`
- No eval; external links use `rel="noopener"`

## Build pipeline
1. Edit `styles.css` / `tailwind.input.css` (if new utilities needed)
2. `./build.sh` — CSS, fonts, images, `sync-head.js`, SW hash
3. `./deploy.sh` or `wrangler deploy`

## File conventions
- No inline `style=""` on static markup; Alpine `:style` OK
- `<head>` / hero h1 sync markers — run `node scripts/sync-head.js` after JSON edits
- Alpine for UI state (menu, modal, expands)
- Vanilla JS for loader, reveals, liquid hero
- Service worker: network-first for `/assets/js/*` and `/assets/css/*`

## Agent context
See `.cursor/skills/portfolio/SKILL.md` and `.cursor/rules/architecture.mdc`.
