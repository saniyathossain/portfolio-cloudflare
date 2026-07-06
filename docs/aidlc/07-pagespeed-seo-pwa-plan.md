# 07 — PageSpeed, SEO, PWA + cross-platform typography

Technical plan for performance, SEO, installable PWA, and identical typography on all platforms after Cloudflare deploy.

Deploy runbook: [08-cloudflare-deploy.md](./08-cloudflare-deploy.md).

## Goals

| Area | Target |
|---|---|
| PageSpeed mobile | 90+ on production |
| SEO | Static meta + JSON-LD in first HTML byte |
| Typography | Self-hosted Inter — same on Mac, Windows, Android, Linux |
| PWA | Installable with service worker + proper icons |
| UX | Glass effects degrade gracefully; loader plays every visit; skipped only on `prefers-reduced-motion` |

## Build pipeline

```bash
./build.sh    # css + fonts + images + sync-head + sw hash
./deploy.sh   # build + wrangler deploy
```

```
build.sh
├── ./build-css.sh
├── ./scripts/setup-fonts.sh
├── node scripts/optimize-images.js
├── node scripts/sync-head.js
└── node scripts/hash-sw.js
```

## Phase 0 — SEO prebuild sync

`scripts/sync-head.js` reads `public/assets/data/portfolio.json` and patches `public/index.html` between:

- `<!-- SYNC:HEAD:START -->` … `<!-- SYNC:HEAD:END -->`
- `<!-- SYNC:H1:START -->` … `<!-- SYNC:H1:END -->`

Writes: title, meta, canonical, OG, Twitter, JSON-LD Person schema, font/image preloads, PWA meta.

Runtime `_applySiteMeta()` in `data.js` remains as idempotent refresh.

## Phase 1 — Self-hosted Inter (fallback-only)

- Font file: `public/assets/fonts/inter-latin.woff2` (variable, latin, 400–700)
- `@font-face` + `--font-sans` leads with Apple system stack; Inter is the non-Apple fallback
- `font-display: swap`; **no** `<link rel="preload">` for Inter (Apple path = zero font download;
  non-Apple loads Inter on demand via swap)
- CSP: `font-src 'self'` only (no Google Fonts CDN)
- Worker Early Hints: hero WebP + `styles.css` only (Inter preload removed)

SF Pro is not web-self-hostable; Inter is the cross-platform substitute on non-Apple devices.

## Phase 2 — Hero LCP

- `saniyat-hossain.webp` + `<picture>` with static JPEG fallback
- Preload WebP in `<head>`
- PWA icons: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (not hero JPEG)

## Phase 3 — PWA

- `public/assets/data/manifest.webmanifest` — `id`, `scope`, proper icons
- `public/sw.js` — cache-first `/assets/**`, network-first HTML + `portfolio.json`
- `scripts/hash-sw.js` injects build version for cache bust
- Registered from `boot.js` (non-blocking)

## Phase 4 — Loader + JS tiers

- Loader: plays on every load; skip only on `prefers-reduced-motion` (visited flag stored but not gated)
- Critical: `data.js`, `boot.js` → `app.js`, Alpine
- On ready: `motion.min.js`, `reveal.js`, `blur-reveal.js`
- On idle: `liquid-hero.js` (pointer:fine only), `motion.js`

## Phase 5 — Cross-env glass

- `@supports not (backdrop-filter)` → opaque glass fallback
- Lighter blur on `max-width: 640px`

## Phase 6 — Signature motion perf budget

Added in the Tahoe colour/motion refinement pass (`09-tahoe-colour-motion-refinement-plan.md`,
`05-redesign-liquid-glass.md` §11): the gradient border-beam, panel spotlight, aurora parallax, and
sheen sweep are all `transform`/`opacity`/`background-position`-only (or a small masked
`conic-gradient` ring repainting ~1.5px on two elements), scoped to a handful of elements, and
disabled under `prefers-reduced-motion` — no new network requests, no CSP changes, no measurable
LCP/CLS impact expected.

## Verification

| Check | How |
|---|---|
| Static SEO | `curl -s https://saniyat.com \| head -50` |
| Font | DevTools → computed `font-family: Inter` on all OS |
| LCP | PageSpeed Insights mobile |
| PWA | Lighthouse PWA + Chrome Install |
| Offline | DevTools → offline reload after first visit |
