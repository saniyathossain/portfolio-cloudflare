# 57 — Security hardening (Worker) and Preact islands

**Date:** 2026-11-24 · **Status:** applied (uncommitted until the owner says so)

## Context
Owner asked for the site to be hardened like a public portfolio should be (XSS, bots, DDoS, rate limits, proper error
handling and logging) so that, if an attack happens, the critical facts can be recovered from the logs. In the same pass:
performance vs production, and a reuse / package review of the TS and JS.

## Threat model (what actually exists)
Static content plus exactly two dynamic surfaces: `POST /api/contact` (public form → KV + email) and
`GET /api/contact` (owner-only read). There is no user-generated HTML rendered back to visitors, no auth cookies, no
database that takes visitor input. The realistic threats are: scanner/bot noise, form spam and abuse of the mail
relay, mail-header injection through the form, cross-site posting (CSRF), token guessing on the admin read, volumetric
DDoS, and script injection through a compromised third-party script (CSP).

## Layers (request order, all in `src/index.js` + `src/worker/security/*`)
| # | Layer | What it does | Config |
|---|-------|--------------|--------|
| 1 | Request guard (`requestGuard.ts`) | method allowlist (GET/HEAD/OPTIONS on static paths → 405), URL length cap (414), control chars / bad percent-encoding / backslash (400), scanner-probe paths (`/.env`, `/.git`, `wp-*`, `*.php`, `*.sql`…) → bare 404. Pure and runs before any asset, KV or email work, so junk traffic costs almost nothing | `security.json` → `allowedMethods`, `limits.maxUrlLength`, `blockedPathPatterns` |
| 2 | Maintenance gate | unchanged (503, `?preview=<ADMIN_TOKEN>` bypass) | `MAINTENANCE_MODE` |
| 3 | Origin guard (`originGuard.ts`) | `POST /api/contact` must come from the same origin (`Origin` / `Sec-Fetch-Site`); foreign → 403 + HIGH event | — |
| 4 | Body cap (`readBoundedText`) | Content-Length checked and the stream itself capped (16 KB) → 413; never buffers an unbounded body | `limits.maxContactBodyBytes` |
| 5 | Rate limits (`rateLimiter.ts`) | contact 3 / 10 min / IP counted only for submissions that pass validation (a typo is not spam), admin failures 5 / 15 min / IP → lockout, CSP reports 20 / min. Backend order: Workers Rate Limiting binding `RATE_LIMITER` (atomic) → KV (durable, shared) → isolate memory (free, best-effort). Fails open on infrastructure errors | `security.json` → `rateLimits` |
| 6 | Honeypot | hidden field `company` (class `.hp-field`, off-screen, `tabindex=-1`, `aria-hidden`); a filled value gets a fake 200 and nothing is stored | `security.json` → `honeypotField` |
| 7 | Payload validation (`contactPayload.ts`) | non-object body → 400; non-string values are empty (no `String({})` coercion); control chars stripped; **line breaks stripped from name/email and `<>"\` from the email display name — this closes a real mail-header-injection hole** (`name` went into `Reply-To` unescaped); length + email shape checks | `limits.*` |
| 8 | Turnstile | enforced once `TURNSTILE_SECRET` is set (unchanged) | secret |
| 9 | Admin read | `Authorization: Bearer <ADMIN_TOKEN>` **only** (query-string tokens leak into logs/history/Referer — removed), constant-time compare, failures counted per IP, lockout → CRITICAL event | `ADMIN_TOKEN` secret |
| 10 | Headers (`headers.ts`) | CSP + `report-uri /api/csp-report`, `upgrade-insecure-requests` (HTTPS only, so plain-http `wrangler dev` still works), `manifest-src`/`worker-src`, HSTS preload, COOP/CORP, `Origin-Agent-Cluster`, tighter Permissions-Policy; API answers are `no-store` + `X-Robots-Tag: noindex` | — |
| 11 | CSP report sink | `POST /api/csp-report` → size- and rate-capped, logged as `csp_violation` (blocked URI, directive, document); a burst usually means injected script | `limits.maxCspReportBytes` |
| 12 | `/.well-known/security.txt` | RFC 9116 contact for researchers | `public/.well-known/security.txt` (renew `Expires` yearly) |

### Known weakness (tracked)
CSP still needs `'unsafe-inline'` and `'unsafe-eval'` for Alpine's standard build. Phase 4 (doc 55) removes Alpine and
then both can go (nonce or hash for the few inline scripts). Until then the main XSS defence is that there is no sink: no
visitor-supplied content is ever rendered, `x-html` only receives site-owned templates/icons, and the CSP still blocks
foreign script hosts, framing, plugins and base-tag tricks.

## Incident logging — what you can recover
Every rejection is one single-line JSON record with the 5W fields (`timestamp`, `actor`, `event`, `location`, `reason`,
`requestId` = Cloudflare ray) and a `context` carrying the client profile from `worker/services/ClientProfileService` (doc 58): `ip`, `country`, `asn`,
`asOrganization`, `colo`, `ray`, `userAgent`, `referer`, `origin`, `fetchSite`, `tlsVersion`, `httpProtocol`, `botScore`
(when the plan provides Bot Management), plus per-event detail. Secrets, tokens and the message body are redacted by
`logging.json` → `redactedKeys`.

| Event | Severity | Meaning |
|-------|----------|---------|
| `scanner_probe` | low | request for `/.env`, `wp-login.php`, … |
| `method_blocked`, `url_too_long`, `bad_encoding`, `control_characters`, `path_traversal` | medium | malformed / hostile request |
| `honeypot_triggered`, `captcha_failed`, `rate_limit_exceeded`, `oversized_body_blocked`, `csp_violation` | medium | bot, spam or injected script |
| `cross_origin_post_blocked`, `admin_auth_failed` | high | someone is attacking the API |
| `admin_locked_out` | **critical** | repeated token guessing on the admin read |

`critical`/`high` are written with `logger.error` so they reach the durable channels (KV / D1, level `error`); low and
medium go to stderr/Workers Logs only, so scanner noise cannot evict the records that matter. Answer to "who hit us,
when, from where, with what": filter Workers Logs (or the KV `log:` prefix) by `context.channel = "security"`, group by
`context.ip` / `context.asn`, and correlate `requestId` with the Cloudflare dashboard Security → Events.

Visitors never see detail: guard rejections are a bare status, API errors are a short code, exceptions show only the
reference id on the shell-console page.

## What cannot live in code (Cloudflare dashboard checklist)
Volumetric (L3/L4/L7) DDoS is absorbed by Cloudflare's network before the Worker runs; the Worker layers above only handle
what gets through. Recommended zone settings (free plan covers all of these):
1. Security → WAF → **Rate limiting rule**: `/api/*` → 10 requests / 10 s per IP → block 10 min (also covers the
   KV-counter's eventual-consistency gap).
2. Security → Settings → **Bot Fight Mode** on; Security Level Medium; Browser Integrity Check on; add a managed
   challenge rule for `/api/*` with `cf.threat_score > 20`.
3. **Under Attack Mode** is the emergency switch during a live flood.
4. Turnstile widget created, site key in `portfolio.json → site.turnstileSiteKey`, `wrangler secret put TURNSTILE_SECRET`.
5. `wrangler secret put ADMIN_TOKEN` (long random value); read submissions with
   `curl -H "Authorization: Bearer $ADMIN_TOKEN" https://saniyat.com/api/contact`.
6. Optional atomic limiter: add a `[[ratelimits]]` binding named `RATE_LIMITER` (see `wrangler.toml`); the code uses it
   automatically.
7. DNS: DNSSEC on; SPF/DKIM/DMARC for `saniyat.com` (the contact mail is sent from it); CAA record; Always-Use-HTTPS and
   HSTS already enforced by the Worker.
8. Create `LOG_KV` (and optionally the D1 `logs` table) so high/critical events persist; turn on Workers Logs.

## Preact instead of React for the islands (performance, same behaviour)
Phase 4 slices 1–2 used React; its client runtime shipped as a 66 KB chunk for two tiny islands. Swapped to
`@astrojs/preact` + `preact` (same hooks API, `preact/hooks`), `@nanostores/preact`. Island chunks now total ≈ 27 KB
raw (≈ 10 KB brotli). Islands, markers and tests unchanged; the doc 55 slice plan stands with "Preact" read for "React".

## Measurements (Lighthouse 13.6, local gzip server vs https://saniyat.com, median of runs)
See the table in the final report of this change; raw JSON lives in the session scratchpad. Local transfer sizes are gzip
(the Worker/Cloudflare serves brotli), so compare bytes only between local builds.

## Verification
- `tests/worker/security.test.ts` (guard, origin, rate limiter incl. binding / KV failure, payload + header injection,
  headers, schema) plus `clientProfile.test.ts` (doc 58) — 158 tests green.
- Live against `wrangler dev`: probes → 404, `%00` → 400, `POST /` → 405, `OPTIONS` → 204, cross-origin POST → 403,
  bad JSON → 400, array body → 400, honeypot → fake 200, oversize → 413, 4th valid submission → 429 with `Retry-After`,
  6th admin failure → 429 lockout, CSP report → 204; every one produced the expected log event.

## Reuse / external-package review of the TS and JS
Method: grep across `public/assets/js/*.js` for repeated mechanics, then judge each against "no UX or performance change".

| Mechanic | Where it repeats | Verdict |
|----------|------------------|---------|
| `prefers-reduced-motion` check | 10 files (aurora, editorial, blur-reveal, motion, boot, liquid-hero, skills-flat, reveal, app, loader) | extract `src/lib/browser/motionPreference.ts` (one `matchMedia`, cached, change listener) **when each file is ported to TS** in the Phase 4 "effects" slice — doing it earlier would touch 10 working files for zero visible gain |
| `IntersectionObserver` reveal | app, editorial, blur-reveal, reveal, motion | one shared `observeOnce(selector, callback)` helper in the same slice; no new package (the native API is smaller than any wrapper) |
| `(hover: hover)` matchMedia | app, boot, editorial | same helper module |
| `getBoundingClientRect` + rAF throttle | app, editorial, motion, liquid-hero, reveal | `lib/browser/frame.ts` (`onNextFrame`, `rafThrottle`) in the same slice |
| Cubic-bezier easing strings | editorial, motion, skills-flat, app | already tokenised in CSS (`--ease-glass`, `--ease-label`); JS copies move to one `easings.ts` constant |
| Tenure / clock / text / colour helpers | already pure TS in `src/lib` with unit tests | done |
| Server-side validation / header safety | new `src/worker/support/controlCharacters.ts` shared by Worker modules | done in this change |

Packages considered and **not** added: Floating UI / Radix (the site has no popover-positioning problem; +6–20 KB for no
visible change), GSAP / framer-motion (Motion One and WAAPI already cover every effect at a fraction of the size), a
state library beyond `nanostores` (planned for the UI shell store only — 0.3 KB). Preact replaced React for the islands
(–40 KB). Every extraction listed above is deferred to the slice that rewrites that file in TypeScript, because the
rule for this repo is exact UX parity and each of those files is currently covered by the DOM-diff and behaviour checks.
