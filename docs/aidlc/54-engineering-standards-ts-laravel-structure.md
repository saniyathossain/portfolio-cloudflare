# 54 — Engineering standards for the Astro/TypeScript port (rules, not a plan of record for visuals)

**Date:** 2026-11-24 · **Status:** adopted — applies to all new/ported code from doc 53 phase 3 on · Supersedes the
JS-only scope of doc 48 for `.ts`/`.tsx`/`.astro` (doc 48 rules 1–4 still apply).

**Governing constraint (owner): none of this may change performance or user experience.** Every rule below is
verified against the doc 53 baseline (screenshots + Lighthouse); a rule that costs a pixel, a millisecond of TBT or a
new request is wrong and loses.

## 1. Language & types
- **TypeScript strict.** `tsconfig`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`. No `any` (use `unknown` + narrowing);
  no `// @ts-ignore` (use `@ts-expect-error` with a reason).
- **DTOs & interfaces:** every shape that crosses a boundary (JSON → components, Worker request/response, analytics
  events, log entries) is a named `interface`/`type` in `src/types/`. Zod schemas in `src/schemas/` are the single
  source — DTO types are `z.infer<…>`, never hand-duplicated.
- **Enums:** closed domains are string `enum`s (`SectionId`, `Platform`, `EmploymentType`, `LogLevel`,
  `AnalyticsEvent`) in `src/enums/`; no magic strings in components or `data-track` attributes.
- Prefer `readonly`, `as const`, discriminated unions and early returns (doc 48 rule 2) over flags and casts.

## 1a. Data lives in JSON, code holds logic only (owner rule, 2026-11-24)
Anything an editor might want to change is **content/config in JSON, validated by Zod, never a literal in code**:
copy, labels, vocabularies (article platforms, hero-card tints, band variants), brand icon/colour/tint tables,
palette anchors and tint-algorithm thresholds, fallback colours, icon paths, feature flags, analytics/log settings.
- `public/assets/data/portfolio.json` — site content (moves to `src/content/` when the legacy runtime is gone).
- `src/content/brands.json` — stack → icon/colour/tint catalogue. `src/content/ui.json` — vocabularies, labels,
  fallback colours, brand-tint parameters. Future: `analytics.json`/`logging.json` (see doc 53 §4, doc 54 §6).
- Code owns only structure and algorithms; values reach it by injection from `ContentRepository`. Enums are for
  **code-logic** domains (e.g. `EmploymentType` keys a label map, `NavAction`, `LogLevel`), **not** data vocabularies —
  those are JSON lists cross-checked by the schema (`createPortfolioSchema(ui)`), so adding a platform is a JSON edit.
- Before adding a constant to `src/`, ask "would an editor change this?" — if yes it belongs in JSON.

## 2. Naming (no `a`, `b`, `c`)
- Names state meaning: `experienceGroup`, not `g`; `scrollOffsetPx`, not `y`; `handleMenuToggle`, not `onClick2`.
  Functions are verbs (`groupExperiencesByCompany`), booleans read as questions (`isMenuOpen`, `hasUnderConstruction`),
  collections are plural, units go in the name (`…Ms`, `…Px`).
- **No single-letter identifiers**, including loop indices (`index`, `row`, `column`), callbacks (`event`, not `e`),
  and generics (`TItem`, not `T`). Only `_` for an intentionally unused parameter. Enforced by lint (§7).
- Casing: `camelCase` values/functions, `PascalCase` types/enums/components, `SCREAMING_SNAKE_CASE` module constants,
  `kebab-case` files except components (`PascalCase.astro`/`.tsx`). CSS keeps its existing BEM/token names.
- Abbreviate nothing that isn't a standard acronym (`id`, `url`, `html`, `api`, `ui`).

## 3. Folder structure (Laravel-style, mapped onto Astro + Worker)

```
src/
  config/          # ≈ config/        site, analytics, logging, feature flags — typed, read from JSON
  types/           # ≈ app/DTOs       interfaces & DTO types (z.infer)
  enums/           # ≈ app/Enums      string enums
  schemas/         # ≈ validation     Zod schemas (content JSON, contact request)
  content/         # ≈ database/seeds portfolio.json (build-time data, doc 53 §2)
  repositories/    # ≈ Repositories   PortfolioRepository — the only code that reads content
  services/        # ≈ app/Services   PortfolioService, ExperienceGrouper, BrandResolver, AnalyticsService, …
  lib/             # ≈ helpers        pure utilities (date, string, dom) — no state, no I/O
  pages/           # ≈ routes/web     index.astro (+ 404)
  layouts/         # ≈ views/layouts  Base.astro, BaseHead.astro
  components/      # ≈ views/components  static .astro, one per section (+ ui/ primitives)
  islands/         # React islands (state + behaviour only)
  scripts/         # client modules: motion, reveal, aurora, loader, analytics bootstrap
  worker/          # ≈ app/Http       the Cloudflare Worker, split below
    routes.ts      #   ≈ routes/api    path → controller table
    controllers/   #   ContactController, MaintenanceController
    middleware/    #   securityHeaders, maintenanceGate, earlyHints, cacheControl
    requests/      #   ContactRequest (Zod validation + DTO)
    services/      #   TurnstileVerifier, ContactMailer, ContactStore (KV)
    index.ts       #   thin entry: build request context → run middleware → dispatch
scripts/           # ≈ app/Console    build/CLI commands (see §6 for output format)
tests/             # unit (services, schemas, lib) + e2e smoke (Playwright, later)
```

- Dependency direction: `pages/components/islands → services → repositories → content`; `types/enums/schemas/config`
  are leaves. Services never import components; components never read JSON directly.
- One class/function per file when it has a name that stands alone; barrel `index.ts` only at layer roots.

## 4. DRY / SOLID (applied, not decorative)
- **S**: one reason to change per module (the Worker's monolithic `src/index.js` splits per §3).
- **O**: add a section/platform/analytics provider by adding a registry entry + one class, not by editing a switch
  (doc 53 `sections` registry; `AnalyticsProvider` interface with `GoogleAnalyticsProvider`, `CloudflareInsightsProvider`).
- **L/I**: small interfaces (`Logger`, `AnalyticsProvider`, `ContentRepository`); implementations substitutable.
- **D**: services receive dependencies (logger, repository, clock) via constructor/parameter, so they test without the
  network and without `Date.now()`.
- **DRY**: second call site earns the helper (doc 48 "no speculative abstraction"); data tables live in JSON/config,
  not copied in markup. No duplicated class lists, brand maps or tint maps.

## 5. Security (least privilege, fail closed)
- CSP strict; **drop `'unsafe-eval'`** when Alpine goes (doc 53 phase 6). No inline event handlers, no `innerHTML` with
  data (render via Astro/React; if raw HTML is unavoidable it comes from our build, never from visitors).
- All external input (contact form, query params, JSON) validated by Zod at the boundary; ids sanitised
  (`/[^\w-]/g`) before reaching HTML (existing `buildAnalytics` rule stays). Output-encode in templates.
- Secrets only as Worker secrets/bindings (`TURNSTILE_SECRET`, `ADMIN_TOKEN`); never in `portfolio.json`, never
  logged. Timing-safe comparison for tokens. Rate-limit/size-limit `/api/contact` (body cap, honeypot, Turnstile).
- Supply chain: exact-pinned deps (`.npmrc save-exact`), committed lockfile, `npm ci` in CI, `npm audit` in the
  preflight, no install scripts we don't need, third-party scripts only from JSON-configured allow-listed hosts.
- Security headers stay in the Worker/`_headers` (HSTS, COOP/CORP, frame-ancestors none, Permissions-Policy).

## 6. Logging — 5W format, console-app output
**One log record = the five W's**, always the same fields (Who/What/When/Where/Why):

| W | Field | Example |
|---|-------|---------|
| When | `timestamp` (ISO-8601 UTC) | `2026-11-24T13:25:01.482Z` |
| Level | `level` (`DEBUG` `INFO` `WARN` `ERROR`) | `INFO` |
| Who | `actor` (component / service / visitor-hash, never PII) | `ContactController` |
| What | `event` (stable `snake_case` id) + `message` | `contact_submitted` |
| Where | `location` (route / file / section id) | `POST /api/contact` |
| Why | `reason` / `context` (cause, input summary, outcome) | `turnstile_ok, kv_stored` |

- **Worker:** implemented in `src/worker/logging/` — a `Logger` writing 5W JSON records to Laravel-style channels
  (`stdout`, `stderr`, `kv`, `database`/D1, `stack`, `silent`) configured in `src/content/logging.json`, overridable with
  `LOG_CHANNEL`/`LOG_LEVEL`; the request id ties a log line to the reference id on the visitor's error page. Secrets are
  redacted by key, strings truncated; exception details and stacks live only in the log, never on the page.
- **Build scripts (`scripts/`)** print like an Artisan/console app, from one shared `scripts/lib/console.ts`:
  ```
   INFO  Building Astro site …                      [3/7]
   DONE  tailwind.css  20.2 KB  (48 ms)
   WARN  hero-1800.webp missing — skipped optimise
  ERROR  preflight failed: unbalanced <style>  at src/legacy/index.html
  ```
  Level badge (colour only when TTY and `NO_COLOR` unset), step counter, size + duration per step, non-zero exit on
  `ERROR`, a one-line summary at the end. `--json` flag emits the 5W JSON for CI.
- **Browser:** logger is a no-op in production unless `site.logging.level` in JSON says otherwise; **never
  transmitted** (no new requests); errors in optional third parties are swallowed and counted, not thrown (doc 53 §4).

### Outage / error pages
Every failure path ends in a shell-console page (`ErrorTerminal.astro`, content in `src/content/errors.json`) that uses
the same 5W fields as the logs — so what the visitor sees and what the log line says are the same record. The pages are
self-contained (no external CSS/JS), never depend on the data layer being healthy, and the Worker falls back to a
one-line plain-text body rather than throwing if even they cannot be fetched.

## 7. Lint, format, structure checks
- **ESLint (flat config) + `typescript-eslint` strict-type-checked + `eslint-plugin-astro` + `eslint-plugin-react-hooks`**,
  **Prettier** (+ `prettier-plugin-astro`) for formatting; `astro check` + `tsc --noEmit` in CI. Scope: `src/`,
  `scripts/`, `tests/` (legacy `public/assets/js/*.js` is exempt until ported).
- Rules that matter here: `id-length` (min 2, no exceptions except `_`), `@typescript-eslint/naming-convention`,
  `no-explicit-any`, `consistent-type-imports`, `no-nested-ternary`, `max-depth` 3, `complexity` ≤ 10, `no-shadow`,
  `prefer-template` (doc 48 rule 1), `curly`, `eqeqeq`, `import/no-cycle`, `no-restricted-imports` to enforce the
  layer direction in §3.
- Scripts: `npm run lint`, `npm run format:check`, `npm run typecheck` — all green before any commit proposal.

## 8. Efficiency (CPU / RAM / network)
- Static HTML by default; React only in islands (`client:idle`/`client:visible`); effects stay plain TS modules.
- Zero runtime content fetch, no JSON parse on the client; one `IntersectionObserver` shared per concern; rAF-coalesced
  scroll/pointer handlers; pause aurora/liquid/clock when the tab is hidden or the element is off-screen; remove
  listeners on teardown; idempotent init (bfcache-safe).
- No new dependency without a measured size/CPU justification; bundle budget tracked in the preflight.
- Worker: no per-request parsing of large JSON, cache headers on hashed assets, `run_worker_first` only `/` + `/api/*`.

## 9. Device & browser compatibility
- Baseline support: last 2 versions of Chrome, Edge, Firefox, Safari (macOS + **iOS 16+**), Samsung Internet, plus
  Android Chrome. `browserslist` in `package.json`; esbuild/Vite target aligned to it.
- Feature-detect, don't UA-sniff; every modern CSS feature in use (`color-mix`, `backdrop-filter`, `@property`,
  `:has`) needs an `@supports`/fallback path that degrades to the same layout; `-webkit-` prefixes kept where Safari
  needs them. Keep `prefers-reduced-motion`, `(hover:hover)`/`(pointer:fine)` and `touch` gates.
- Verified at 360 / 768 / 1024 / 1440 plus a touch-device pass (iOS Safari, Android Chrome) before phase sign-off.

## 10. PWA (installable, no UX change)
- Already present: `manifest.webmanifest`, 192/512 icons, `apple-touch-icon`, `theme-color`, `sw.js`.
- Target: valid manifest (`id`, `scope`, `start_url`, `display: standalone`, `maskable` icon, `shortcuts` optional),
  offline fallback page, precache from the Astro build manifest, versioned caches with clean-up, network-first HTML,
  cache-first hashed assets, SW registered after `load` (never blocks render). **No in-page install banner** (would
  change UX); the browser's own install affordance is enough. Lighthouse PWA/installability checks must pass.

## 11. Verification (every phase)
`npm run lint && npm run typecheck && npm run build`; screenshot + computed-style diff vs the doc 53 baseline;
Lighthouse mobile/desktop ≥ baseline; console clean; CSP clean; zero new requests with default config.

## Open items
- Tenure unit words ("year", "month", "—") and a few remaining UI strings still live in `src/lib/tenure.ts`; move to `ui.json` when the components that render them are ported.
- Pick the test runner (Vitest for units, Playwright for e2e) when the first service lands (phase 3).
- `engine-strict=true` is on in `.npmrc` (Node 26.13.1 via FlyEnv on the owner's machine, 2026-11-24).
- npm 12 skips dependency install scripts (esbuild, workerd, fsevents) until approved with `npm install-scripts approve`; builds and `wrangler` work without it today — approve only if a binary goes missing.
