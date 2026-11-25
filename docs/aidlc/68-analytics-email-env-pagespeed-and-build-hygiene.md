# 68 — Analytics / email / Turnstile configuration, PageSpeed findings, build hygiene

**Date:** 2026-11-25 · **Status:** applied (uncommitted until the owner says so)

## 1. Where each credential lives (and where to change it on Cloudflare)
| Setting | Kind | Variable | Where to set |
|---|---|---|---|
| Google Analytics 4 id (`G-…`) | public, **build time** | `GOOGLE_ANALYTICS_ID` | Dashboard → Workers & Pages → *Worker* → **Settings → Build → Variables and secrets** (local: `.env`) |
| Cloudflare Web Analytics token | public, build time | `CLOUDFLARE_ANALYTICS_TOKEN` | same as above (leave blank: the beacon costs ~10 KB) |
| Turnstile **site** key (`0x…`) | public, build time | `TURNSTILE_SITE_KEY` | same as above |
| Turnstile **secret** | secret, runtime | `TURNSTILE_SECRET` | **Settings → Variables and secrets → Add → Secret** (or `npx wrangler secret put TURNSTILE_SECRET`) |
| Contact sender / recipient | runtime var | `CONTACT_FROM`, `CONTACT_TO` | `wrangler.toml [vars]`, or remove the line and add it under **Settings → Variables and secrets** (`keep_vars = true` keeps dashboard values across deploys) |
| Admin token | secret, runtime | `ADMIN_TOKEN` | Secret, as above |
| Email transport | binding | `CONTACT_EMAIL` (`[[send_email]]`) | **Settings → Bindings**; destination must be verified in *domain → Email → Email Routing → Destination addresses* |

Build variables are read by `scripts/sync-head.ts` (analytics tags) and `PortfolioService` (Turnstile key) through
`src/lib/buildSettings.ts`; a non-blank variable wins over `public/assets/data/portfolio.json`, blank keeps the JSON value
(empty JSON = feature off, zero third-party requests). Email needs **no password or API key**: it uses the Email Routing binding;
a third-party provider (Resend, SMTP) would be a new `ContactNotifier` implementation (doc 66). Examples: `.env.example`, `.dev.vars.example`.

## 2. PageSpeed Insights findings (live site, 25 Nov 2026) and what was done
Mobile 92 (FCP 1.1 s, LCP 1.1 s, TBT 250 ms, CLS 0, SI 4.7 s); desktop 93 (TBT 100 ms, CLS 0.044, SI 2.5 s); A11y / BP / SEO 100.
| Finding | Cause | Action |
|---|---|---|
| Cloudflare `beacon.min.js` (10 KB, "legacy JS", 1 d cache, `/cdn-cgi/rum`) | Cloudflare Web Analytics automatic injection | HTML now sent with `Cache-Control: no-transform` (documented to stop injection); `ALLOW_EDGE_INJECTION=on` re-enables. Dashboard alternative: Analytics & Logs → Web Analytics → Disable |
| Image delivery: `icddrb-official.webp` 96×88 for a 24–28 px slot | logo derivative width 96 | `LOGO_MAX_WIDTH` 56, quality 82 (icddrb 6.9 → 3.0 KB) |
| **CLS** (`p.hero__wm`, hero copy/aside) — reproduced locally under throttling | (a) `#auroraCanvas`, injected by JS, sat in normal flow until `styles.min.css` landed → the page was pushed down ~450 px and then jumped back; (b) the critical (inlined) CSS lacked Tailwind's reset/components/utilities and had drifted from `styles.css` (`.hero h1` fixed height, `.glass-pill` padding, mobile hero overrides) | `#auroraCanvas` rules added to critical; whole compiled Tailwind output now inlined in `critical.min.css`; `.hero h1`, `.glass-pill` and the mobile hero blocks mirrored; new `scripts/critical-parity-check.ts` measures critical-only vs full layout |
| TBT 250 ms: `loader.min.js` 132 / 83 / 55 ms, `motion.min.js` 78 ms; forced reflow in `shell-effects` 75–170 ms | class toggle at loader end restyles ~1 555 elements | **Not changed** (needs profiling; reading nav-pill boxes later would only delay the pill) |
| Speed Index 4.7 s | loader scrim + reveal animations | **Not changed** (UX decision) |
| Network chain 3.7 s (14 `/_astro` chunks, idle hydration) | island chunk waterfall | **Not changed**; candidate: merge chunks / modulepreload |
| Unused CSS 18 KiB, Minify CSS 3.4 KiB, 181–226 non-composited animations, DOM 1 555 | large single stylesheet, colour/shadow transitions | **Not changed** |

`critical-parity-check` (local, needs Chrome): after the fixes the 1350 px hero matches within 3 px and 390 px matches; known leftovers are
the fixed header pill (75.8 vs 69 px, no layout impact) and the 768 px hero rating line wrapping. Run:
`BASE=http://127.0.0.1:8800/ node scripts/critical-parity-check.ts`.

## 3. Build hygiene (from the Workers Builds log)
| Log line | Fix |
|---|---|
| `npm warn deprecated node-domexception@1.0.0` (wrangler → cloudflare → formdata-node) | `overrides`: `node-domexception` → `@nolyfill/domexception` |
| `npm warn install-scripts … not yet covered by allowScripts` | `allowScripts` in `package.json`: esbuild and workerd approved (pinned), `@parcel/watcher` and `fsevents` denied (optional / build-from-source) |
| 8 × `minify-css containment` warnings | The probe check compared formatted text to a minified bundle (false positives) and missed real drift; removed. Replaced by the layout-based parity check |
| Wrangler telemetry banner | `send_metrics = false` |
| Image derivatives regenerated on every CI build (`scripts/.img-cache.json` was gitignored) | cache committed as `scripts/img-cache.json`; CI skips unchanged images |
| Build uploaded the Worker twice (`./deploy.sh` deployed, then the platform ran `npx wrangler deploy`) | `deploy.sh` exits after build + preflight when `WORKERS_CI=1` / `CI=true`; locally it still deploys. In Workers Builds set **Build command** `npm run build` (or keep `./deploy.sh`) and **Deploy command** `npx wrangler deploy` |
Verified with a clean copy of the working tree (`npm clean-install` then `WORKERS_CI=1 ./deploy.sh`): no warnings, exit 0.
Also: `.gitignore` refreshed (stale CI comment, key-material patterns, tool caches), `.gitattributes` added (LF, binary, generated files).
