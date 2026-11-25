# 66 — Environment configuration and Worker refactor

**Date:** 2026-11-25 · **Status:** applied (uncommitted until the owner says so)

## 1. Tooling
- `wrangler` 4.167.0 → **4.168.0** (pinned).
- TypeScript stays on the latest 6.x (**6.0.3**). TypeScript 7.0.2 was tried: `tsc` works, but `astro check` refuses to run on 7.0 and
  `eslint` (typescript-eslint) fails to load, so 7 is not usable yet. Revisit when Astro's TS 7.1 mapper / typescript-eslint support lands.

## 2. Where to configure what
| Kind | Where | Notes |
|---|---|---|
| Local development | `.dev.vars` (copy `.dev.vars.example`) | gitignored; used by `wrangler dev` |
| Public values | `wrangler.toml` → `[vars]` (or Dashboard → Worker → Settings → Variables) | plain text, committed |
| Secrets | `npx wrangler secret put NAME` (or Dashboard → Variables → Encrypt) | `ADMIN_TOKEN`, `TURNSTILE_SECRET`; never committed |
| Bindings | `wrangler.toml` (`[[kv_namespaces]]`, `[[d1_databases]]`, `[[send_email]]`, `[[ratelimits]]`) | each is optional and guarded |
| Policy defaults | `src/content/security.json`, `src/content/logging.json` | what applies when no variable is set |

All names are enumerated in `src/enums/EnvVar.ts`. Numeric variables are applied by `src/worker/config/EnvironmentConfigResolver.ts`:
the JSON value is the default, a variable wins when it is a **whole number inside the allowed range**, anything else is ignored and logged
once per isolate as `invalid_env_config` (the site keeps working). Adding a tunable = one row in that table + one `EnvVar` entry + docs.

| Variable | Default (security.json) | Range | Purpose |
|---|---|---|---|
| `RATE_LIMIT_CONTACT_LIMIT` / `_WINDOW_SECONDS` | 3 / 600 | 1–1000 / 1–86400 | contact form submissions per IP |
| `RATE_LIMIT_ADMIN_FAILURE_LIMIT` / `_WINDOW_SECONDS` | 5 / 900 | 1–1000 / 1–86400 | failed admin logins before lockout |
| `RATE_LIMIT_CSP_REPORT_LIMIT` / `_WINDOW_SECONDS` | 20 / 60 | 1–10000 / 1–86400 | CSP violation reports accepted |
| `MAX_URL_LENGTH` | 2048 | 64–8192 | request guard |
| `MAX_CONTACT_BODY_BYTES` | 16384 | 256–1048576 | contact body cap |
| `MAX_CSP_REPORT_BYTES` | 8192 | 256–65536 | CSP report cap |
| `MAX_NAME_LENGTH` / `MAX_EMAIL_LENGTH` / `MAX_PROJECT_LENGTH` | 120 / 200 / 4000 | 1–500 / 3–320 / 1–20000 | field limits |
| `CONTACT_RETENTION_SECONDS` | 31536000 | 60–157680000 | KV retention of submissions |
| `MAINTENANCE_RETRY_AFTER_SECONDS` | 3600 | 1–86400 | `Retry-After` on the maintenance 503 |
| `ADMIN_LIST_DEFAULT_LIMIT` / `ADMIN_LIST_MAX_LIMIT` | 50 / 200 | 1–1000 | owner read endpoint page size |
Existing, unchanged: `CONTACT_FROM`, `CONTACT_TO`, `MAINTENANCE_MODE|TITLE|MESSAGE`, `LOG_CHANNEL`, `LOG_LEVEL`, `SKILLS_SCROLL_DESIGN`,
`ADMIN_TOKEN`, `TURNSTILE_SECRET`.

## 3. Worker refactor (behaviour unchanged)
| Before | After |
|---|---|
| `ContactController` (332 lines: routing, validation, rate limiting, storage, mail, admin auth) | thin `ContactController` (routing) + `actions/SubmitContactAction` + `actions/ListContactSubmissionsAction` |
| KV calls inside the controller | `repositories/ContactSubmissionRepository` (interface) + `KvContactSubmissionRepository`; a D1 repository is a new class, not an edit |
| email sending inside the controller | `services/ContactNotifier` (interface) + `EmailRoutingNotifier` |
| bearer check + lockout inside the controller | `security/AdminAuthenticator` |
| magic numbers (`401`, `429`, …) and strings (`"rate_limited"`) | enums `HttpStatus`, `ApiErrorCode`, `EnvVar` |
| `config` fixed at module load | `EnvironmentConfigResolver` resolves config per environment (memoised); `WorkerApplication` passes it to controllers, `securityServices.guardFor(config)` memoises the guard |
| stored record shape inline | DTO `types/StoredContactSubmission` |
Error handling: repository and notifier never throw (they log with `logger.exception` and resolve `false`); everything else is caught once
in `WorkerApplication.handle` → logged 500 page with a reference id.

## 4. Outage page: services list, Geist type, console voice
- **Fonts:** Geist (headline, copy) and Geist Mono (request/status/retry/services lines, buttons, unit labels), self-hosted
  (`public/assets/fonts/geist-latin.woff2` 29 KB, `geist-mono-latin.woff2` 23 KB, SIL OFL 1.1) — vendored from the pinned
  `@fontsource-variable/geist[-mono]` devDependencies by `scripts/setup-fonts.sh`. No third-party request; the main site still uses Inter.
- **Services / peripherals list** inside the frosted well: one row per service with a state dot, label, optional detail and state text.
  Data lives in `src/content/errors.json`:
  - `terminal.services.catalog` — every service the pages may report (`edge`, `worker`, `assets`, `network`, `cache`, `dataSource`).
  - `terminal.services.states` — display text for `ok | degraded | down | unknown` (enum `ServiceState`).
  - `pages.<slug>.services[]` — `{ id, state, detail?, live? }` in display order. `live: "network"` keeps the entry in sync with
    `navigator.onLine` in the browser (the build-time state is the fallback).
- **Adding a service later** (e.g. a data-source or cache error): add `"cache": "cache"` to the catalog, then add
  `{ "id": "cache", "state": "down", "detail": "miss storm" }` to the pages that should show it. The schema fails the build if a page
  references an id that is not in the catalog (`tests/unit/errorPages.test.ts`). No code change is needed.
- Build-time states are the *typical* condition for that failure (a 500 means the worker failed; a 502 means assets did not answer);
  they are not live probes. A real health probe would be a Worker endpoint feeding the same `ServiceState` values.

## 5. Outage page script moved to `src/client/error-page.ts`
The inline `<script>` in `ErrorTerminal.astro` is now strict TypeScript (`RetryStore`, `Orb`, small functions, no magic numbers).
`scripts/build-client.ts` bundles it to `src/generated/error-page.min.js` (gitignored, **not** under `public/`, so it is never served as
an asset) and the component inlines it with `?raw`, so an outage page still needs no second request. `npm run typecheck` rebuilds it
first; a fresh clone needs one `npm run build` (or `node scripts/build-client.ts`) before `astro dev`.
Checked in a browser: path line, countdown + backoff, live `network` service on `offline`/`online`, exhausted state, reduced-motion stepping.

## Verification
121 unit tests (new: resolver, KV repository), `tsc`, ESLint clean. `wrangler dev` end-to-end with
`--var RATE_LIMIT_CONTACT_LIMIT:1`: submission 200 then 429, admin without token 401 / with token 200, OPTIONS 204, scanner probe 404,
invalid `MAX_URL_LENGTH` ignored and logged as `invalid_env_config`.
Outage pages (500 at 1440 / 360, 503, 502, offline) screenshotted: Geist + Geist Mono loaded, no failed requests except the browser's own `/favicon.ico`.
