# 58 — Client profile forensics and production readiness

**Date:** 2026-11-24 · **Status:** applied (uncommitted until the owner says so) · builds on doc 57

## Context
Owner asked for much richer, traceable client information in the security log (browser, device, Android/iOS, hardware,
model, PC model, network, MAC address…), in a standards-compliant, typed, DRY, SOLID, Laravel-style structure, plus a
production-deployment and `.gitignore` review.

## What a website can and cannot learn (the honest list)
| Wanted | Available? | Source / reason |
|--------|-----------|-----------------|
| Browser name + version | yes | User-Agent signatures, Client Hints brands / full version list |
| Rendering engine | yes | UA (Blink / Gecko / WebKit) |
| OS + version | yes (partly) | UA; **macOS and iOS freeze the version in the UA**; Chromium reports real Windows / Android version via `Sec-CH-UA-Platform-Version` after `Accept-CH` |
| Device type (desktop / mobile / tablet / bot) | yes | UA tables + `Sec-CH-UA-Mobile` |
| Android phone model | yes on Chromium | UA (`SM-S918B`) or `Sec-CH-UA-Model` when the UA is reduced to `K` |
| iPhone / iPad model | **no** | Apple exposes only "iPhone" / "iPad"; no model string exists in any request header |
| PC / laptop model, serial, CPU, RAM | **no** | never sent; browsers sandbox it. Only CPU architecture / bitness via client hints (Chromium) |
| **MAC address** | **never** | a MAC lives on the local network segment and is rewritten by every router; no website, Worker, CDN or ISP-facing server ever sees it |
| IP, IP version, ASN + provider, country, region, city, timezone | yes | `CF-Connecting-IP`, `request.cf` |
| Cloudflare data center, HTTP version, TLS version + cipher | yes | `request.cf` |
| TLS client fingerprint (JA3 / JA4), TCP RTT, bot score | when the plan provides it | `request.cf.botManagement`, `clientTcpRtt` — the strongest tool-identification signal when a User-Agent lies |
| Language, fetch metadata (site / mode / dest), referer, origin | yes | request headers |
| Screen size, GPU, fonts, canvas | not collected | would need client-side fingerprinting JS — deliberately excluded (privacy, performance, new request) |

So the closest durable identifiers to "which machine" are **IP + ASN, JA3/JA4, client hints and Accept-Language** — all
captured. Nothing here uses cookies, storage or extra network requests.

## Architecture (Laravel-style layers, all under `src/`)
| Layer | File | Responsibility |
|-------|------|----------------|
| Enums | `enums/DeviceType.ts`, `ClientHintHeader.ts`, `SecuritySeverity.ts` | closed vocabularies, no magic strings |
| DTOs | `types/ClientProfile.ts` (`ClientProfile`, `NamedVersion`, `DeviceInfo`, `ClientHintsInfo`, `BotInfo`, `NetworkInfo`, `RequestInfo`), `types/ClientSignatures.ts`, `types/SecurityConfig.ts` | readonly, strictly typed data shapes |
| Config (data in JSON) | `content/clientSignatures.json`, `content/security.json` | browser / engine / OS / device / bot tables, thresholds, probe paths |
| Schemas | `schemas/clientSignaturesSchema.ts`, `securitySchema.ts`, shared `regexSourceSchema.ts` | Zod: unknown keys and invalid regexes fail tests |
| Services | `worker/services/UserAgentParser`, `ClientHintsReader`, `NetworkProfileReader`, `ClientProfileService` | one reader per source (SRP), one service composing them; hints correct the frozen / reduced UA |
| Security components | `worker/security/requestGuard`, `originGuard`, `rateLimiter`, `contactPayload`, `headers`, `securityEvents` | single-purpose, pure where possible |
| Provider / container | `worker/bootstrap/container.ts` | the only place that instantiates services (per-isolate singleton, signature tables compile once) |
| Lib | `lib/controlCharacters.ts` | shared string-safety helpers |
| Entry | `src/index.js` | thin controller: guard → API handlers → assets; no business rules inline |

Dependencies are injected through constructors (`ClientProfileService(parser, hintsReader, networkReader)`), so each
reader can be swapped or faked in tests (DIP). Adding a browser, device or bot is a JSON edit, not a code change (OCP).

## Log record shape
`logSecurityEvent` writes (single line JSON, secrets redacted by `logging.json`):

```
context: {
  channel: "security", severity, summary: "Chrome 131 · Android 15 · mobile Google Pixel 9",
  request: { method, path, referer, origin, fetchSite, fetchMode, fetchDestination, ray },
  client:  { userAgent, browser{name,version}, engine, os, device{type,vendor,model}, hints{…}, bot{isBot,category,cloudflareScore,…},
             acceptLanguage, network{ ip, ipVersion, country, region, city, timezone, asn, asOrganization, datacenter,
             httpProtocol, tlsVersion, tlsCipher, ja3Hash, ja4, clientTcpRttMilliseconds } },
  …event detail
}
```
API access lines (`contact_api`) carry the compact set (`ip, country, asn, ray, ua, client` summary). The site now sends
`Accept-CH` (device model, platform version, arch, bitness, full version list) on HTML responses so the browser attaches
those hints to the later same-origin `POST /api/contact` and security-relevant requests (≈ 200 bytes, no extra request).

### Privacy and retention
These fields exist to investigate abuse of the site, not to profile visitors: they are written only on security events and
API calls, never on ordinary page views, never sent to a third party, redacted of tokens, and expire with the KV log TTL
(`logging.json` → `ttlSeconds`, 7 days). Add a short line to any future privacy notice: *"For security, the server logs IP
address and browser/device details of requests that look abusive or use the contact form, for up to 7 days."* The contact
form stores IP, country, ASN and UA with the message for a year (existing behaviour, `CONTACT_KV`).

## Production readiness review (Cloudflare)
Verified locally: `wrangler deploy --dry-run` bundles (154 assets, 46 KiB upload, bindings listed), `wrangler dev` end-to-end
tests in doc 57, `npm run build`, lint, `astro check`, 158 tests. Wrangler is **not logged in on this machine**, so the
live account (secrets, KV, routes) could not be inspected — the items below are what the owner must confirm.

| # | Item | State | Action |
|---|------|-------|--------|
| 1 | `.DS_Store` files were being uploaded to production (`dist/.DS_Store`, `dist/assets/.DS_Store`) | **fixed** | `public/.assetsignore` (`.DS_Store`, `Thumbs.db`) |
| 2 | `/.well-known/security.txt` | **new**, absent on prod (404 today) | ships with the next deploy; renew `Expires` before 2027-11-24 |
| 3 | `CONTACT_KV` not bound | **gap** | until bound, contact messages are **not stored** (logs deliberately exclude the body) and only the email path keeps them. Create KV and uncomment the binding |
| 4 | `CONTACT_EMAIL` (`send_email`) not bound | **gap** | enable Email Routing + verify `CONTACT_TO`, uncomment binding. With 3 and 4 both unbound a valid submission returns 200 and is lost |
| 5 | `LOG_KV` not bound | **gap** | high / critical security events only reach stdout / stderr (Workers Logs) until bound; create it so incidents persist 7 days |
| 6 | `ADMIN_TOKEN`, `TURNSTILE_SECRET` secrets | unknown (cannot read) | `wrangler secret put …`; without Turnstile the CAPTCHA layer is off (visible as `turnstile_configured:false` in logs) |
| 7 | `compatibility_date = 2024-12-01` | old but valid | bump to a current date after a staging check; re-run the e2e checks |
| 8 | `public/_headers` | redundant | the Worker (`run_worker_first`) sets all headers; kept for dev servers that do not run the Worker |
| 9 | Cloudflare dashboard controls | owner | WAF rate-limit rule on `/api/*`, Bot Fight Mode, DNSSEC, SPF/DKIM/DMARC, Always HTTPS — checklist in doc 57 |
| 10 | Deploy command | ready | `./deploy.sh` (build + preflight + `wrangler deploy`); owner must say go — nothing was deployed |
| 11 | Rollback | ready | `npx wrangler rollback` restores the previous version |

### `.gitignore` review
Correct and sufficient: `dist/`, `.astro/`, `node_modules/`, `.wrangler/`, `.dev.vars*`, `.env*` (with `.example`
exceptions), generated `*.min.js|css`, `tailwind.css`, caches, per-machine agent state and the archived `/legacy/` are
ignored; sources, `skills-lock.json`, vendored `impeccable` and `wrangler.toml` (no secrets — `CONTACT_TO` / `CONTACT_FROM`
are public addresses) are tracked. `git ls-files` contains no secrets, keys or env files. Added `.dev.vars.example`
(tracked, safe placeholders incl. Cloudflare's published always-pass Turnstile test secret). Remaining hygiene: macOS
`.DS_Store` is ignored by git and now also by the asset uploader.

## Verification
- `tests/worker/clientProfile.test.ts` — 12 UA fixtures (Chrome/Edge/Safari/Firefox, Windows/macOS/iOS/iPadOS/Android/Linux,
  Samsung model, curl/sqlmap/Googlebot/HeadlessChrome/empty UA), hints reader, reduced-model repair from hints, JA3/JA4 +
  Cloudflare fields, summary line, `Accept-CH` — plus schema rejection tests.
- Live (`wrangler dev`): a forged Android request with client hints produced `summary: "Chrome 131 · Android 15.0.0 · mobile
  Android Pixel 9"` with the full `client` object in a `cross_origin_post_blocked` record; a `sqlmap` probe of `/.env` was
  logged as `scanner_probe` / `category: scanner`; HTML responses carry `Accept-CH`.

## Outage pages: orb + circular retry timer (owner request)
`src/components/ErrorTerminal.astro` keeps the shell-console window, and gains an **orb** beside the title block: a glass
sphere (radial highlight, same recipe as the site's `.clock-face`), a soft breathing halo, a drifting satellite, and a **ring
that drains over the retry delay** with the seconds left in the centre (status code on pages without retry, `!` when there is
neither). Tone follows the level: copper for WARN, red for ERROR, green once the browser reports it is back online.

Performance: the ring drains through **one CSS animation** (`stroke-dashoffset`, duration set once from JS), the halo,
float and orbit are transform/opacity only, and the DOM text now updates **once per displayed second** (the old ASCII bar
rewrote `innerHTML` ten times a second). Tick default 100 ms → 250 ms; the ring pauses with the countdown while the tab is
hidden. `prefers-reduced-motion`: all orb animation off, the ring steps once per second from JS. The page stays
self-contained (inline CSS/JS, no new requests). Config cleanup: `progressFilled/Empty/progressWidth` removed from
`errors.json` and its schema, `terminal.orb.{idleGlyph,secondsLabel}` added.

## Stack pills: one logo per pill, broken-icon fallback (owner request)
- **No duplicate logos.** `BrandResolver.distinctByIcon(names)` keeps the first stack for each icon and is used by the
  experience role lists, the grouped skills panels and the flat skills list (and mirrored in `skills-flat.js` so the
  "+N more" count matches). Result: "Laravel Horizon" (a part of Laravel) and "RediSearch" (a part of Redis) no longer add a
  second Laravel / Redis pill; there is no separate RediSearch logo in the icon set and none was invented. The CV data is
  unchanged (the names still appear in the bullets and the `Tech:` lines); only the pill list is de-duplicated. Stacks
  with no logo are always kept (their monogram is unique). Covered by `tests/unit/brandResolver.test.ts`, which also asserts
  no shipped list can show two pills with the same logo.
- **Broken icon.** The Webpack icon file is valid and served (200, `image/svg+xml`) both locally and on production, and
  renders in a clean Chrome, so the broken glyph came from the image failing to load in that browser (extension / filter-list
  block, flaky request). Fix is generic: a delegated, capture-phase `error` listener in `boot.js` swaps any failing
  `.brand-pill__badge img` for the pill's monogram (same fallback unknown brands use), including pills mounted later from the
  accordion templates. Verified by forcing a failing `src` (pill showed "W").

## Outage pages re-themed to match the site (owner: "nowhere near the design theme")
The first orb pass kept a full monospace terminal window, which looked like a different product from the portfolio. The page
now speaks the site's language (taken from `styles.css` / `critical.css` tokens, still self-contained inline CSS):
Inter / SF sans stack with the tight `-0.042em` bold headings and text-shadow stack; the frosted `.glass-panel` recipe
(2rem radius, tinted inner glow, top specular, hue rim — copper for WARN, red for ERROR); the glass header pill with the
brand name ("Mohammad Saniyat" + copper "Hossain") and the dark pill holding the traffic lights; pastel aurora blobs
(peach, lavender, sea-teal) behind it; the dark primary and glass secondary **pill buttons with the arrow chip** replacing
`$ retry # …` text links; tinted status chip. The shell console is now one nested dark-glass strip (same material as the
site's MENU / dark pills) holding the prompt line and the when/who/what/where/why/ref rows. The orb (glass sphere, 60-tick bezel, draining
ring, radar ripples, satellite) sits left of the title on desktop and above it on mobile (≤ 46rem, buttons full width ≤ 30rem).
No new requests; animation budget unchanged (transform / opacity / `stroke-dashoffset`, all off under reduced motion).

## Worker is TypeScript now (`src/index.js` → `src/index.ts`)
The last hand-written JS in `src/` was the 570-line Worker. It is now layered like the rest of the code base:
`index.ts` (adapter: logger → pipeline → `waitUntil(drain)`) → `worker/WorkerApplication.ts` (guard → preflight → maintenance → API →
static) → `controllers/ContactController.ts` (submit split into `refuseBadRequest`, `refuseOverLimit`, `readSubmission`, `screen`;
admin read split into `authenticateAdmin`, `readRecent`), `controllers/CspReportController.ts`, `http/StaticSiteResponder.ts`
(cache policy, early hints, Accept-CH, portfolio.json flag merge), `http/{jsonResponse,readBoundedText,apiAccessLog,earlyHints}.ts`,
`services/{FeatureFlags,TurnstileVerifier,ContactMailComposer}.ts`, `lib/timingSafeEqual.ts`, typed `WorkerEnvironment`, and the
composition root `worker/bootstrap/application.ts` (separate from `container.ts` to avoid an import cycle). `wrangler.toml`
`main` → `src/index.ts`; `set-asset-version.js` now stamps the `?v=` hash in `worker/http/earlyHints.ts`; tsconfig / ESLint no
longer exempt the Worker. Verified: `astro check` 0 errors, lint clean, 172 tests (new: timing-safe compare, flags, mail
composer incl. header injection, bounded body), `wrangler deploy --dry-run` bundles, and the full live matrix against `wrangler dev`
(probes 404, cross-origin 403, bad JSON 400, array 400, honeypot fake-200, rate limit 429 on the 4th valid post, admin lockout on
the 6th failure, CSP report 204, security headers + Accept-CH, `portfolio.json` served) gives the same answers as before.

### What is still JS / HTML (and why it is not converted in this pass)
| File | Lines | Status |
|------|-------|--------|
| `public/assets/js/app.js` (Alpine root: nav, hero carousel, modal, form), `motion.js`, `data.js`, `editorial.js`, `reveal.js`, `loader.js`, `icons.js`, `blur-reveal.js`, `liquid-hero.js`, `skills-flat.js`, `aurora.js`, `boot.js`, `sw.js` | ≈ 4,700 | live legacy runtime, tied to Alpine directives in `src/legacy/index.html`; ported slice by slice in Phase 4 (doc 55: hero carousel → UI shell store → contact modal → experience accordion → skills → editorial → effects), each with DOM-diff + behaviour parity. Converting them in one go would change a working UX without a parity net |
| `src/legacy/index.html` (491 lines) | | the marker-split page; shrinks as sections move to `.astro`, disappears with Alpine |
| `scripts/*.js`, `scripts/*.mjs` | build / measurement tools | Node CLI scripts, outside the app bundle; ESLint-exempt by design (doc 54) — convert only if they grow |

### Outage page, round 3 — simpler and on-theme (owner feedback)
Removed: radar ripples, orbiting satellite, bezel ticks, track ring and halo (the orb is now a glass sphere inside **one**
thin countdown ring), the animated aurora blobs (background is the site's own `#f1f0ee → #e3e2df` hero gradient with two very
faint static washes so the glass reads), the hint line and five of the six console rows (only the command line and the `ref`
id remain; when/who/what/where/why stay in `errors.json` for logs but are not rendered). Typography now matches the site:
Inter (same self-hosted `inter-latin.woff2` + metric-matched fallback), weight 800 headings at `clamp(2.35rem, 3.4vw + .8rem, 3.5rem)`
with `-0.042em`, 500-weight tinted subtitle at the site's `clamp(1.0625rem, 1.65vw, 1.25rem)`. The panel is liquid glass: translucent
gradient fill, `backdrop-filter: blur(26px) saturate(215%)`, tinted rim and the soft-light top specular film from `.glass-panel`.

### Outage page, round 4 — no header, no black console, ring *is* the border
Removed the glass header pill (brand + traffic-light pill) and the dark console strip entirely. The orb is a single object now: the
sphere fills the ring and the animated arc **is** its border (no separate track, no gap). What is left on the page: orb,
status chip, title, message, the two pill buttons and a footer line; the request `ref` id shows only when the Worker fills it
(`.ref:empty` is hidden, label comes from `data-label`). `terminal.*` / `page.command|actor|event|reason` in `errors.json` are no
longer rendered (they remain in the schema for the logs and can be dropped in a later cleanup).

### Outage page, round 5 — one liquid-glass dialog (`/impeccable`, owner: "not looking good at all")
Root problem of rounds 1–4: a wide two-column card with a lot of dead space, an eyebrow chip above the title and a glyph in
the retry line. Rebuilt as **one centred Tahoe-style dialog** (28.5rem, 2rem radius): orb → title → message → pills → footer.
- **Liquid glass, for real:** translucent gradient fill + `backdrop-filter: blur(26px) saturate(215%)` (allowed: one fixed,
  non-scrolling surface, `docs/DESIGN.md` §4), a **specular rim** (border-box gradient bright at the lit corners), tinted drop
  shadow, soft-light top film. Three static hue fields (peach, lavender, sea-teal) sit *behind* the card so the glass visibly
  bends colour — the site's own page colour `#f1f0ee → #e3e2df` underneath.
- **Orb:** a glass lens (clock-face recipe) whose own edge is the single countdown ring (no track, no halo, no ripples).
- **Removed:** status chip/eyebrow (status moved into the footer line), the `⟳` glyph and the duplicated seconds text
  (`retry 1/8` remains; seconds live in the orb), `terminal.retry.prefix` from `errors.json` and its schema.
- **Motion:** one entrance (opacity + translate, exponential ease-out), the orb float, and the ring drain; all off under
  `prefers-reduced-motion` (ring then steps once a second). Selection colour, focus ring, `text-wrap: balance/pretty`, a
  `@supports not (backdrop-filter)` fallback with a more opaque fill. Checked at 360 / 390 / 1280, reduced motion, no
  horizontal overflow, no page errors.

### Outage page, round 6 — site background, refined type (owner: "too much glow", "typography aesthetic")
Background is now exactly the site's hero background (`critical.css .hero`): one warm sun-glare ray at the top right over the
`#f1f0ee → #e3e2df` gradient — the three colour fields are gone. Typography moved from heavy-and-tight to light-and-airy:
headline Inter 600 / `-0.034em`, message weight 400 / line-height 1.65 in a softer tint, orb numerals weight 300 at 3.5rem,
unit / retry / footer lines as small tracked caps (`0.14–0.2em`, weight 500), reference id with tabular numerals (no
monospace). Glass, ring, buttons and behaviour unchanged.
