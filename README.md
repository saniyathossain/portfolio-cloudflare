# Saniyat Hossain — Portfolio

**Live site:** [https://saniyat.com](https://saniyat.com)

Portfolio of Mohammad Saniyat Hossain — Staff Software Engineer. A static **Astro 7 + TypeScript** site in a macOS Tahoe
"Liquid Glass" design, with a few **Preact islands**, served by a **Cloudflare Worker** that adds security headers, rate
limits, the contact API and structured security logging. Content comes from one JSON file.

## Features

- Liquid-glass UI: intro loader, glass header with live clock, liquid hero, scroll reveals, press-swell controls, pill
  label reveal, editorial tabs, experience accordion, contact modal
- Real CV content (never invented): experience, skills, education, projects, stats — all from `portfolio.json`
- Static, server-rendered sections (Astro), JSON-validated at build time (Zod); islands hydrate on idle (Preact, ≈ 10 KB brotli)
- Lighthouse 97–100 mobile / 99–100 desktop, accessibility / best-practices / SEO 100 (see `docs/aidlc/57`)
- SEO: generated `<head>`, Open Graph, Twitter cards, JSON-LD `Person`, sitemap, robots, PWA manifest + service worker
- Self-hosted fonts and icons — no third-party requests by default; analytics is opt-in via JSON
- **Security:** request guard, rate limits, honeypot, same-origin check, CSP with violation reporting, hardened headers,
  header-injection-safe mail, forensic security log (details below and in `docs/aidlc/57`)
- Shell-console error / maintenance / offline pages with a retry countdown (`src/content/errors.json`)

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Astro 7 (static output), TypeScript 6 (strict), Zod 4 schemas |
| Islands | Preact 11 + `@astrojs/preact`, nanostores (BackToTop, HeaderClock, HeroCards, NavOverlay, ContactModal, SkillsFlat, ExperienceAccordion, Editorial) |
| Browser runtime | strict TypeScript in `src/client` bundled by esbuild + Preact islands in `src/islands`; no framework runtime, no `unsafe-eval` (`docs/aidlc/55`, `60`, `61`) |
| Styles | hand-written design system `styles.css` + Tailwind v4 utilities (precompiled) |
| Hosting | Cloudflare Workers + Static Assets (`run_worker_first`) |
| Quality | ESLint 10 + Prettier, Vitest, puppeteer-core behaviour/parity scripts, Lighthouse 13 |
| Runtime | Node **26.13.1** (`.nvmrc`) |

## Project structure

```
portfolio-cloudflare/
├── public/                     # Static files copied into dist/
│   ├── assets/{css,js,data,fonts,img}/   # styles.css, generated JS bundles, portfolio.json, Inter, images
│   ├── .well-known/security.txt
│   ├── sw.js · robots.txt · sitemap.xml
├── src/
│   ├── index.ts                # Worker entry (thin adapter) → worker/WorkerApplication.ts pipeline
│   ├── worker/
│   │   ├── controllers/        # ContactController, CspReportController
│   │   ├── security/           # requestGuard, originGuard, rateLimiter, contactPayload, headers, securityEvents
│   │   ├── services/           # UserAgentParser, ClientHintsReader, NetworkProfileReader, ClientProfileService
│   │   ├── bootstrap/          # container.ts (service provider)
│   │   ├── logging/            # Laravel-style channels (stderr, stdout, kv, d1), 5W records, redaction
│   │   └── http/               # request id, error pages, static-site responder, early hints, JSON helpers
│   ├── content/                # ui.json, brands.json, icons.json, errors.json, logging.json, security.json
│   ├── schemas/ · types/ · enums/   # Zod schemas + inferred DTOs
│   ├── repositories/ · services/ · bootstrap/   # ContentRepository, PortfolioService, composition root
│   ├── components/ · pages/ · legacy/index.html # Astro sections, pages, marker-split legacy page
│   ├── islands/                # Preact islands (BackToTop, HeaderClock)
│   ├── client/                 # browser runtime in TypeScript (app, motion, data, editorial, icons, effects, boot, sw) → esbuild
│   └── lib/                    # clock, tenure, colour, text, controlCharacters, browser helpers
├── tests/{unit,worker,parity}/ # Vitest
├── scripts/                    # build steps + measurement tools (lh-matrix, behavior-check, dom-diff, …)
├── docs/aidlc/                 # design history and rationale (00–58) — start at 00-overview.md
├── migrations/ · wrangler.toml · build.sh · build-css.sh · deploy.sh
└── CLAUDE.md                   # conventions for AI agents working in this repo
```

## Getting started

```bash
nvm use            # Node 26.13.1
npm ci
npm run build      # legacy asset pipeline (Tailwind, fonts, images, head sync, minify) + astro build → dist/
npm run dev        # astro dev
npx wrangler dev   # run the real Worker locally (headers, API, rate limits) on :8787
```

macOS image tooling used by `scripts/optimize-images.ts`: `cwebp` (`brew install webp`) and ImageMagick
(`brew install imagemagick`).

### Checks

```bash
npm run lint && npm run typecheck && npm test
```

Parity / performance tools (run against a built `dist/` served by `node scripts/serve-static.ts dist 8803`):
`scripts/behavior-check.ts`, `scripts/dom-diff.ts`, `scripts/fouc-check.ts`, `scripts/measure-gaps.ts`,
`scripts/responsive-check.ts`, `scripts/lh-matrix.sh 3 prod=https://saniyat.com/ new=http://127.0.0.1:8803/`.

## Deploy

```bash
./deploy.sh        # npm run build → preflight-check → wrangler deploy
```

Attach `saniyat.com` and `www.saniyat.com` under Workers → Settings → Domains & Routes. Runbook:
`docs/aidlc/08-cloudflare-deploy.md`. Never deploy, push or merge without the owner's say-so (`docs/aidlc/48`).

## Editing content

Single source of truth: `public/assets/data/portfolio.json` (validated by `src/schemas/portfolioSchema.ts`). CV truth is
`docs/cv-modern-template.md` — do not invent employers, dates or titles. UI labels, brand/colour tables and error copy
live in `src/content/*.json`. After editing `site`/`profile`, run `node scripts/sync-head.ts` (it owns the content between
the `SYNC:HEAD` / `SYNC:H1` markers in `index.html`).

## Editing styles

| Task | File |
|------|------|
| Design tokens, components, motion | `public/assets/css/styles.css` (+ `critical.css` for first-paint tokens — keep `--sec-*` in sync) |
| Tailwind utilities | `tailwind.input.css` → `./build-css.sh` (generated `tailwind.css` is gitignored) |
| Section spacing | one rule: `--sec-gap`, `--sec-title-gap`, `--sec-head-gap`, `--sec-bleed` (doc 56) |

Rules: no inline `style=""`, light-only theme, every animation gated by `prefers-reduced-motion`, verify at 360 / 768 /
1024 / 1440.

## Architecture

```
Browser → Cloudflare edge (DDoS, WAF, rate-limit rules, Bot Fight)
        → Worker src/index.ts → WorkerApplication
            1 request guard      method allowlist, URL/path sanity, scanner-probe paths   (src/worker/security)
            2 maintenance gate   MAINTENANCE_MODE → 503 shell-console page
            3 API                /api/contact (POST form, GET admin read), /api/csp-report
            4 static assets      dist/ via ASSETS binding + security headers + Cache-Control + Early Hints
        → logger (stderr / stdout / KV / D1) with 5W records and a request id on every line
```

## Security

Summary (full design, threat model and Cloudflare dashboard checklist: `docs/aidlc/57-security-hardening-and-preact-islands.md`).

| Area | Control |
|------|---------|
| Bots / scanners | request guard (404 for `/.env`, `wp-*`, `*.php`…), method allowlist, Turnstile, honeypot field |
| Rate limiting | contact 3 per 10 min per IP, admin-failure lockout 5 per 15 min, CSP-report cap; Workers rate-limit binding → KV → memory (thresholds in `src/content/security.json`) |
| XSS / injection | no visitor content is ever rendered; CSP (`object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, reporting); input stripped of control characters; mail headers built from sanitised values |
| CSRF | `POST /api/contact` requires same `Origin` / `Sec-Fetch-Site` |
| Transport | HSTS preload, `upgrade-insecure-requests` (HTTPS), COOP / CORP, nosniff, Permissions-Policy |
| Admin | `ADMIN_TOKEN` secret, `Authorization: Bearer` only, constant-time compare, lockout |
| DDoS | absorbed by Cloudflare; enable WAF rate-limit rule + Bot Fight Mode (checklist in doc 57) |
| Logging | structured security events (low → critical) with a full client profile (IP, ASN, location, browser, OS, device/model, client hints, TLS/JA3/JA4, bot class, ray id); high/critical go to durable KV/D1; no MAC address exists on the wire (doc 58) |
| Disclosure | `/.well-known/security.txt` (renew `Expires` yearly) |

Operations:

```bash
npx wrangler secret put ADMIN_TOKEN        # required to read submissions
npx wrangler secret put TURNSTILE_SECRET   # turns the CAPTCHA on
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://saniyat.com/api/contact
npx wrangler tail --format json | grep '"channel":"security"'   # live security events
```

Production checklist (bindings, secrets, dashboard rules, what is still missing): `docs/aidlc/58`.

CSP no longer allows `'unsafe-eval'` (Alpine is gone, doc 61). Remaining gap: `'unsafe-inline'` for the inline bootstrap scripts and critical `<style>` — next step is hashes/nonces.

## SEO checklist

After deploy verify `robots.txt`, `sitemap.xml`, `/assets/data/manifest.webmanifest`, `/.well-known/security.txt` on
`https://saniyat.com`.

## Legacy

The earlier dc-runtime site is not in this repo (gitignored); `src/legacy/index.html` is the marker-split page the Astro
sections are carved from (doc 53).

## License

Personal portfolio — © Mohammad Saniyat Hossain.
