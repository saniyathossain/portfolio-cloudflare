# 69 — Real-user Web Vitals (RUM)

## Context
PageSpeed Insights shows lab data (one synthetic Lighthouse run) and, when Google has enough traffic, CrUX field data.
The owner wanted PageSpeed-style numbers per **page section** and per **browser / device / model**, from real visitors,
without a third-party script. Doc 68 left analytics opt-in and "zero requests" by default; this keeps that rule.

## Decisions
| Topic | Decision |
|---|---|
| Opt-in, two switches | Build var `RUM_SAMPLE_RATE` (0..1, public, baked as `<meta name="portfolio-rum">`) decides whether `vitals.min.js` is ever loaded and for what share of visits. Worker var `RUM_ENABLED=on` decides whether `POST /api/vitals` stores anything. Either off = no request, no storage. |
| Collector | `src/client/vitals.ts` + `src/client/lib/vitals/*`: PerformanceObservers for LCP, CLS (session windows), INP, FCP, TTFB, long-task TBT; IntersectionObserver dwell time per section; Client Hints (model, platform) read early, beacon sent once on `visibilitychange`/`pagehide` with `navigator.sendBeacon` (`text/plain`, no CORS preflight). ~6 KB, loaded at idle after `motion`. Bots (`navigator.webdriver`) skip. |
| Section attribution | `sectionOf(element)` → `header`, each `section[id]`, footer = `contact`, else `page`. LCP / CLS-worst / INP carry `{section, element}`; each section also reports `visibleMs` and its own CLS. Valid ids come from `src/content/vitals.json` (`sections`). |
| Endpoint | `POST /api/vitals` (`CollectVitalsAction`): 405 for non-POST, 413 over `limits.maxVitalsBodyBytes` (4096); everything else (feature off, bot, cross-origin, rate-limited, malformed) answers a quiet `204` and stores nothing. Rate limit `rateLimits.vitals` {20 / 60 s}. Payload is whitelisted and clamped by `parseVitalsPayload` (unknown keys/sections dropped, numbers clamped, text stripped of markup). |
| Device facts | Browser: model, platform, viewport, DPR, memory, cores, connection, reduced-motion, colour scheme. Edge: country, device type/vendor, browser, OS (`ClientProfileService`). |
| Privacy | No IP, cookie, user id or fingerprint stored. `country` only. Retention `vitalsRetentionDays` (90), pruned opportunistically on ~2 % of writes (no cron). |
| Storage | D1 (default connection, binding `DB`, doc 70), table from `migrations/0002_create_web_vitals_table.sql`. No binding = measurement is logged on the `info` channel (`event: web_vitals`) so it is observable via `wrangler tail` before D1 exists. |
| Read | `GET /api/vitals?days=7&limit=500` with `Authorization: Bearer $ADMIN_TOKEN` → JSON summary: p75 + good / needs-improvement / poor shares (PSI thresholds, `vitals.json`) overall and by device type, browser, OS, device model, connection and section (`summarizeVitals`). |

## Set-up (production)
```bash
npx wrangler d1 create portfolio-vitals
npx wrangler d1 execute portfolio-vitals --remote --file=migrations/0002_create_web_vitals_table.sql
# wrangler.toml: uncomment [[d1_databases]] binding = "DB" (id from the create step); [vars] RUM_ENABLED = "on"
# Workers Builds → Variables: RUM_SAMPLE_RATE = 0.1   (local: .env)
./deploy.sh
curl -H "Authorization: Bearer $ADMIN_TOKEN" "https://saniyat.com/api/vitals?days=7"
```
Tunables (Worker vars, `.dev.vars.example`): `MAX_VITALS_BODY_BYTES`, `RATE_LIMIT_VITALS_LIMIT/_WINDOW_SECONDS`,
`VITALS_RETENTION_DAYS`.

## Files
`src/content/vitals.json`, `src/schemas/vitalsSchema.ts`, `src/types/WebVitals.ts`, `src/lib/webVitals.ts` (rating,
percentile, summaries), `src/worker/{security/vitalsPayload,repositories/*,actions/*Vitals*,controllers/VitalsController}.ts` (storage layer: doc 70),
`src/client/vitals.ts`, `src/client/lib/vitals/{collector,device,sections}.ts`, `src/client/boot.ts` (`isSampledForRum`).
Tests: `tests/unit/webVitals.test.ts`, `tests/worker/vitals.test.ts`.

## Verification
tsc, eslint, vitest (139 tests) clean. `wrangler dev --var RUM_ENABLED:on`: cross-origin / malformed POST → 204 and nothing stored; same-origin POST → 204 and logged (`web_vitals`, no DB bound); `GET` without token 401, with token 200 (`vitals_db_not_configured` until D1 is bound). Real browser run with `RUM_SAMPLE_RATE=1`: `vitals.min.js` loaded at idle and the `pagehide` beacon carried LCP/CLS/FCP/TTFB/TBT, LCP attribution `home › img#heroBaseImg` and per-section dwell. D1 round-trip not run locally (needs a real database id).

## Database queries and Cloudflare free tier
Engine: **Cloudflare D1** (managed SQLite). Only three statements, all with bound `?` parameters (no string concatenation):
`INSERT INTO web_vitals (…) VALUES (?, …)` per beacon, `SELECT … WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT ?` for
the owner summary, and `DELETE FROM web_vitals WHERE timestamp < ?` for retention. Percentiles and shares are computed in the
Worker (`summarizeVitals`), not in SQL, so the schema stays plain. D1 was chosen because per-device / per-section breakdowns
need queryable rows, and the repo already uses D1 for logs (doc 57); since doc 70 both share the one default connection.

Free plan (limits as published by Cloudflare at time of writing — re-check the D1 pricing page): D1 5 M rows read / day,
100 k rows written / day, 5 GB storage, 10 databases; Workers 100 k requests / day. One beacon = 1 table row + 2 index
entries ≈ 3 rows written, so about 33 k sampled views / day fit; lower `RUM_SAMPLE_RATE` if traffic ever nears that. Storage at
~0.6 KB per row and 90-day retention stays far below 5 GB. Over-limit writes fail, are caught, logged, and still answer 204
(the page never notices); reads of the summary use at most `limit` rows (default 2000).

## Secret scan (gitleaks)
`gitleaks dir .` and `gitleaks git .` (157 commits): no real secrets. 4 + 2 hits were all the `generic-api-key` rule matching
third-party skill docs/code under `.agents/skills` (e.g. "whisper-large-v3 with word granularities"); `.gitleaks.toml`
allow-lists those vendored paths so a clean run reports 0.

## Open questions
- Add a small owner dashboard page reading the summary (not built; JSON only).
- Revisit sample rate once traffic is known; low traffic means percentiles need `days=30`.
