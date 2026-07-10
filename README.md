# Saniyat Hossain — Portfolio

**Live site:** [https://saniyat.com](https://saniyat.com)

Static portfolio for Mohammad Saniyat Hossain — Staff Software Engineer. Built on the Lumora design system, filled with content from the portfolio-v2 seed data, and deployed on Cloudflare Workers with Static Assets.

## Features

- Lumora-inspired layout: intro loader, glass header, liquid hero, scroll reveals, dark stats panel, footer watermark
- Real CV content: experience (including four Brain Station 23 roles with individual expand), skills, education, projects
- No runtime npm dependencies — Alpine.js and Motion are vendored locally
- Precompiled Tailwind CSS via standalone CLI (no `node_modules`)
- SEO: static meta prebuild, Open Graph, Twitter cards, JSON-LD `Person`, sitemap, PWA manifest + service worker
- Typography: self-hosted Inter woff2 (identical on all platforms)
- Security: CSP, HSTS, and related headers applied by the Worker

## Tech stack

| Layer | Technology |
|-------|------------|
| Markup | Semantic HTML (`public/index.html`) |
| Styles | `styles.css` (design tokens) + `tailwind.css` (utilities) |
| Interactivity | Alpine.js 3, vanilla JS modules |
| Hosting | Cloudflare Workers + Static Assets |
| Build | `./build.sh` (Tailwind + fonts + images + SEO sync + SW hash) |

## Project structure

```
portfolio-cloudflare/
├── public/                    # Deploy root (served as static assets)
│   ├── index.html             # Main page
│   ├── _headers               # Cache rules for /assets/*
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── sw.js                    # Service worker (PWA)
│   └── assets/
│       ├── css/               # styles.css + tailwind.css
│       ├── fonts/             # inter-latin.woff2 (self-hosted)
│       ├── data/              # portfolio.json + manifest.webmanifest
│       ├── js/               # data.js, boot.js, aurora.js, … + vendor/ (alpine, motion)
│       └── img/               # profile, logos, favicon, og-image
├── src/index.js               # Worker — security headers on every response
├── wrangler.toml              # Cloudflare Workers config
├── build-css.sh               # Compile Tailwind only
├── build.sh                   # Full pre-deploy build
├── deploy.sh                  # build + wrangler deploy
├── tailwind.input.css         # Tailwind source
├── tailwind.config.js
├── scripts/                   # sync-head.js, optimize-images.js, hash-sw.js
├── skills-lock.json           # locked design-taste skills
├── .agents/ .codex/ .cursor/  # agent skills, impeccable hook, Cursor rules
└── docs/aidlc/                # Design system + content mapping notes
```

## Prerequisites

- [Node.js](https://nodejs.org/) (for `npx wrangler` only — not required at runtime)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) — installed via `npx` or globally
- Cloudflare account with Workers enabled (for deploy)
- macOS build tools: `sips` (built in), `cwebp` (`brew install webp`), `ImageMagick`
  (`brew install imagemagick`) — used by `scripts/optimize-images.js` for the responsive hero
  srcset and the favicon/icon duotone pipeline. `magick` is required for the face-centered crop
  (`sips` has no reliable arbitrary-offset crop); without it, `optimize-images.js` regenerates the
  hero srcset but skips favicon/icon regeneration with a warning.

## Local development

### 1. Build

Run before deploy (and after content/CSS changes):

```bash
./build.sh
```

This runs Tailwind, vendors Inter font, optimizes images, syncs SEO meta from `portfolio.json`, and stamps the service worker cache version.

CSS only (faster during style iteration):

```bash
./build-css.sh
```

On first run `build-css.sh` downloads the Tailwind standalone binary into `bin/` (gitignored).

### 2. Preview locally

**Option A — Cloudflare Workers (recommended, matches production):**

```bash
npx wrangler dev
```

**Option B — Simple static server:**

```bash
python3 -m http.server 8080 --directory public
```

Then open [http://localhost:8080](http://localhost:8080) (or the port Wrangler prints).

## Deploy to Cloudflare

```bash
./deploy.sh
```

Or manually: `./build.sh && npx wrangler deploy`

Full runbook: [docs/aidlc/08-cloudflare-deploy.md](docs/aidlc/08-cloudflare-deploy.md)

After deploy, attach the custom domain **saniyat.com** in the Cloudflare dashboard:

1. Workers & Pages → your worker (`saniyat-portfolio`)
2. Settings → Domains & Routes → Add `saniyat.com` and `www.saniyat.com`

Ensure DNS for `saniyat.com` points to Cloudflare.

## Editing content

All page content lives in one JSON file — the single source of truth, loaded at runtime by `data.js`:

```
public/assets/data/portfolio.json
```

CV truth for that JSON is `docs/cv-modern-template.md` (do not invent employers, dates, or titles). When syncing from the legacy seed data, the source is `portfolio-v2/codes/database/seeders/data/` in the sibling docker repo.

Key sections in `portfolio.json`: `site`, `profile`, `nav`, `services`, `experiences`, `companies`, `skills`, `education`, `socials`, `stats`, `sections`.

Site URL constant:

```js
site: { url: "https://saniyat.com", ... }
```

## Editing styles

| Task | File |
|------|------|
| Design tokens, components, animations | `public/assets/css/styles.css` |
| Tailwind utilities / `@apply` components | `tailwind.input.css` → run `./build-css.sh` |
| Lumora palette reference | `docs/aidlc/01-design-system.md` |

**Rule:** no inline `style=""` in HTML.

## Architecture

```
Browser → Cloudflare Worker (src/index.js)
       → Static Assets (public/)
       → HTML + CSS + JS + images
```

The Worker adds security headers (CSP, HSTS, `X-Frame-Options`, etc.) on top of static file responses. Asset caching is configured in `public/_headers`.

## SEO checklist

Canonical and OG URLs use `https://saniyat.com`. After deploy, verify:

- [https://saniyat.com/robots.txt](https://saniyat.com/robots.txt)
- [https://saniyat.com/sitemap.xml](https://saniyat.com/sitemap.xml)
- [https://saniyat.com/assets/data/manifest.webmanifest](https://saniyat.com/assets/data/manifest.webmanifest)

## Legacy

An earlier dc-runtime site (`support.js` + inline styles) predated this rebuild. It is **not** in this repo (gitignored) — there is nothing here to extend or deploy.

## License

Personal portfolio — © Mohammad Saniyat Hossain.
