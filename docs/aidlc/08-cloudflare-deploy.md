# 08 — Cloudflare deploy runbook

## Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npx wrangler`)
- Cloudflare account with Workers enabled
- DNS for `saniyat.com` on Cloudflare

## Build and deploy

```bash
./build.sh      # always run before deploy
./deploy.sh     # build + npx wrangler deploy
```

### What `build.sh` does

1. Tailwind CSS (`build-css.sh`)
2. Download Inter woff2 if missing (`scripts/setup-fonts.sh`)
3. WebP + PWA icons (`node scripts/optimize-images.js`; requires `cwebp` — `brew install webp`)
4. Sync SEO meta from `portfolio.json` (`scripts/sync-head.js`)
5. Stamp service worker cache version (`scripts/hash-sw.js`)

## Custom domain

1. Cloudflare dashboard → Workers & Pages → `saniyat-portfolio`
2. Settings → Domains & Routes
3. Add `saniyat.com` and `www.saniyat.com`
4. Ensure DNS A/AAAA or CNAME proxied through Cloudflare (orange cloud)

## Worker architecture

```
Browser → Cloudflare edge (Brotli, HTTP/3, Early Hints)
       → Worker (src/index.js) — security headers + Link preload
       → Static Assets (public/)
```

## Dashboard optimizations

| Setting | Recommendation |
|---|---|
| SSL/TLS | Full (strict) |
| HTTP/3 | Enabled |
| Early Hints | Enabled (Worker sends `Link` preload headers) |
| Brotli | Enabled (automatic) |
| Tiered Cache | Enabled |
| Auto Minify | Off for CSS/JS (already minified at build) |
| Polish / Mirage | Off (images self-optimized to WebP) |
| Speed Brain | Optional |

## Cache headers

Configured in `public/_headers` and supplemented by `src/index.js`:

| Path | Cache-Control |
|---|---|
| `/assets/*` | `public, max-age=31536000, immutable` |
| `/assets/fonts/*` | `public, max-age=31536000, immutable` |
| `/assets/data/portfolio.json` | `public, max-age=3600` |
| `/`, `/index.html` | `public, max-age=0, must-revalidate` |

## Post-deploy checklist

- [ ] https://saniyat.com loads with Inter font
- [ ] https://saniyat.com/robots.txt
- [ ] https://saniyat.com/sitemap.xml
- [ ] https://saniyat.com/assets/data/manifest.webmanifest
- [ ] Service worker registers (DevTools → Application)
- [ ] [PageSpeed Insights](https://pagespeed.web.dev/analysis?url=https://saniyat.com)
- [ ] [Rich Results Test](https://search.google.com/test/rich-results) for Person schema
- [ ] OG preview (opengraph.xyz or LinkedIn debugger)

## Local preview (production-like)

```bash
npx wrangler dev
```

## Troubleshooting

| Issue | Fix |
|---|---|
| Font 404 | Run `./scripts/setup-fonts.sh` |
| Empty meta tags | Run `node scripts/sync-head.js` |
| SW stale cache | Bump deploy (hash-sw runs automatically) |
| CSP blocks font | Ensure `font-src 'self'` in `src/index.js` |
