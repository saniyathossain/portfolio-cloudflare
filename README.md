# Saniyat Hossain — Portfolio

**Live site:** [https://saniyat.com](https://saniyat.com)

Static portfolio for Mohammad Saniyat Hossain — Staff Software Engineer. Built on the Lumora design system, filled with content from the portfolio-v2 seed data, and deployed on Cloudflare Workers with Static Assets.

## Features

- Lumora-inspired layout: intro loader, glass header, liquid hero, scroll reveals, dark stats panel, footer watermark
- Real CV content: experience (including four Brain Station 23 roles with individual expand), skills, education, projects
- No runtime npm dependencies — Alpine.js and Motion are vendored locally
- Precompiled Tailwind CSS via standalone CLI (no `node_modules`)
- SEO: Open Graph, Twitter cards, JSON-LD `Person`, sitemap, web manifest
- Security: CSP, HSTS, and related headers applied by the Worker

## Tech stack

| Layer | Technology |
|-------|------------|
| Markup | Semantic HTML (`public/index.html`) |
| Styles | `styles.css` (design tokens) + `tailwind.css` (utilities) |
| Interactivity | Alpine.js 3, vanilla JS modules |
| Hosting | Cloudflare Workers + Static Assets |
| Build | Tailwind standalone CLI (`build-css.sh`) |

## Project structure

```
portfolio-cloudflare/
├── public/                    # Deploy root (served as static assets)
│   ├── index.html             # Main page
│   ├── _headers               # Cache rules for /assets/*
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── site.webmanifest
│   └── assets/
│       ├── css/               # styles.css + tailwind.css
│       ├── js/                # data.js, app.js, loader.js, reveal.js, liquid-hero.js
│       ├── js/vendor/         # alpine.min.js, motion.min.js
│       └── img/               # profile, logos, favicon, og-image
├── src/index.js               # Worker — security headers on every response
├── wrangler.toml              # Cloudflare Workers config
├── build-css.sh               # Compile Tailwind (downloads CLI to bin/ on first run)
├── tailwind.input.css         # Tailwind source
├── tailwind.config.js
├── legacy/                    # Archived dc-runtime site (do not deploy)
└── docs/aidlc/                # Design system + content mapping notes
```

## Prerequisites

- [Node.js](https://nodejs.org/) (for `npx wrangler` only — not required at runtime)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) — installed via `npx` or globally
- Cloudflare account with Workers enabled (for deploy)

## Local development

### 1. Build CSS

Run after any change to `tailwind.input.css`, `tailwind.config.js`, or Tailwind classes in HTML:

```bash
./build-css.sh
```

On first run this downloads the Tailwind standalone binary into `bin/` (gitignored).

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
npx wrangler deploy
```

After deploy, attach the custom domain **saniyat.com** in the Cloudflare dashboard:

1. Workers & Pages → your worker (`saniyat-portfolio`)
2. Settings → Domains & Routes → Add `saniyat.com` and `www.saniyat.com`

Ensure DNS for `saniyat.com` points to Cloudflare.

## Editing content

All page copy lives in one file:

```
public/assets/js/data.js
```

Authoritative source when syncing updates:

```
/Users/bs01616/app/docker/www/p/portfolio-v2/codes/database/seeders/data/
```

Key sections in `data.js`: `profile`, `experiences`, `experienceGroups`, `projects`, `skills`, `education`, `socials`, `stats`.

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
- [https://saniyat.com/site.webmanifest](https://saniyat.com/site.webmanifest)

## Legacy

The previous dc-runtime site (`support.js` + inline styles) is archived in `legacy/`. Do not extend or deploy it.

## License

Personal portfolio — © Mohammad Saniyat Hossain.
