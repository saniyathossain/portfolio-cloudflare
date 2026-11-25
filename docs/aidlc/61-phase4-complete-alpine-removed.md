# 61 — Phase 4 complete: Alpine removed

**Date:** 2026-11-24 · **Status:** applied (uncommitted until the owner says so) · closes doc 55

## Result
Alpine.js, its `'unsafe-eval'` CSP requirement, the runtime data fetch (`data.ts` → `window.PORTFOLIO_DATA`, `portfolio.json`) and the runtime icon
catalogue (`icons.ts`) are gone. The page is server-rendered by Astro; the interactive parts are Preact islands or small typed modules.

| Slice | Was (Alpine) | Is now |
|-------|--------------|--------|
| Back to top, header clock | `showBackToTop`, `tickClock` | islands `BackToTop`, `HeaderClock` (doc 55 slices 1–2) |
| Hero "Now" card | `cardIndex`, `cardStep`, badge swap | island `HeroCards` + `src/lib/heroCard.ts` (tint table / swap time / labels in `ui.json` → `heroCard`) |
| Menu, nav overlay, contact modal, scroll lock, hash navigation | `menuOpen`, `modalOpen`, `submitForm`, `scrollLock`… | nanostores `src/stores/ui.ts`; one delegated listener `src/client/actions.ts` for `data-action` / `data-nav-target` / `data-scroll-target`; islands `NavOverlay`, `ContactModal` (+ `FadeError`); typed controller in `src/client/lib/shell/*`; values in `ui.json` → `shell` |
| Experience accordion | `toggleRole`, `x-if` + `x-html` lazy mount | behaviour-only island `ExperienceAccordion` (Astro still renders every row, so nodes held by reveal / motion stay stable); first-open body mount from the inert `<script type="text/html">`; `ui.json` → `experienceAccordion` |
| Skills flat strip | `skillsFlatPanel()` | island `SkillsFlat` (toggle + show/hide + height animation); pill list computed once at build by `BrandResolver.distinctByIcon`; `ui.json` → `skillsFlat` |
| Editorial | `editorialHelpers()` (≈ 750 lines) | island `Editorial` (+ `src/islands/editorial/*`, `src/lib/editorial.ts`, `src/lib/browser/editorialMotion.ts`); config in `ui.json` → `editorial`, copy in `portfolio.json` → `copy.editorial` |
| Nav pill, idle pause, hero contrast, header `is-scrolled`, tap-reveal pills | `portfolioApp.init()` | `src/client/shell-effects.ts` + `src/client/lib/effects/*` (nav ids read from the server-rendered `.nav-desktop [data-nav-target]`) |
| Loader copy, arrow icons in hero CTAs | filled by `data.ts` / `x-html` at runtime | server-rendered (`LoaderBrand`, `LoaderTagline`, `ArrowIconMd` markers) |

Removed code: `src/client/{app,editorial,skills-flat,data,icons}.ts`, `lib/app/*`, `lib/hydrate.ts`, `lib/siteMeta.ts`, `lib/iconCatalog.ts`, `NavOverlayData/Items.astro`,
`public/assets/js/vendor/alpine.min.js`, the migration parity tests (`legacyPortfolioParity`, `legacyIconParity` — they compared against the code that no longer exists),
`[x-cloak]` rule and the `data.min.js` / `icons.min.js` script tags. `scripts/build-client.ts` now also deletes stale `*.min.js` bundles whose TS entry is gone.

## Boot and loading
`boot.ts` → registers the service worker, loads `actions` + `shell-effects`, then `reveal` + `blur-reveal`, then (idle) `motion`, `liquid-hero`, `aurora`. No Alpine,
no `portfolio.json` request (one request fewer on every visit). The `portfolio-ready` event still comes from `loader.ts`.

## Security
`script-src` no longer contains `'unsafe-eval'` (`src/worker/security/headers.ts`). Verified against the real Worker (`wrangler dev`): menu, modal, accordion, editorial
tab and hero arrow work at 1280 and 390 px with no console errors, no CSP violations, no failed requests. `'unsafe-inline'` remains for the inline bootstrap scripts and the
critical `<style>`; hashing them is the next hardening step.

## Behaviour notes found on the way
- Legacy bug fixed: under `prefers-reduced-motion` the accordion opened an **empty** panel (the `x-if` body mount was tied to the animated path). The island mounts the body in both modes.
- Legacy bug fixed: the TS port had dropped the `panel._heightTimer` expando that `pillReflow` reads; the shared `heightAnimation` sets it again.
- Skills flat strip, reduced motion: the panel is re-synced after the toggle so extra pills are not clipped.
- Editorial titles are split on first load (production only split them after a tab switch because `window.blurReveal` was undefined when Alpine initialised).
- Third hero card title differs from production (`portfolio.json` says "solution architecture", production still serves "mobile architecture") — content drift, not code.
- Hydration: `SkillsFlat` and `ExperienceAccordion` use `client:idle` (an island with no box of its own never intersects, so `client:visible` never fires).

## Verification
`tsc`, `astro check`, ESLint clean; 114 unit tests; `behavior-check` `problems: []`; FOUC guard OK; DOM diffs against production per region (hero card identical;
nav overlay / modal differ only by new `data-*` attributes and `inert=""`; editorial identical apart from the title split and 1–3 px lens width from font rendering);
Lighthouse numbers in the session report. Hover-heavy effects (pill FLIP, tilt, parallax) were ported earlier and are covered by code review, not pixel diffs.

## Lighthouse 13.6 (3 runs each, local gzip server for the new build vs https://saniyat.com/; brotli on prod, so compare bytes loosely)
| | prod mobile | new mobile | prod desktop | new desktop |
|---|---|---|---|---|
| Performance | 98–99 | **100** | 99–100 | **100** |
| TBT (ms) | 80–135 | **39–53** | 5–7 | **0** |
| LCP (ms) | 963–1006 | 964–978 | 662–728 | 625–684 |
| CLS | 0.027–0.065 | **0.000** | 0.033–0.047 | 0.000–0.033 |
| Transfer (KB) | 349 | **287** | 331–364 | **327** |
| Requests | 34 | 38 | 37 | 41–42 |
| A11y / best-practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 | 100 / 100 / 100 | 100 / 100 / 100 |
Less main-thread work (no Alpine, no per-load JSON fetch) is the whole TBT gain; the extra 4 requests are small island / bundle chunks that load after paint.

## Follow-up: Node tooling is TypeScript too
Every build and verification script in `scripts/` is now strict TypeScript run directly by Node 26 (`node scripts/<name>.ts`, native type stripping — no tsx, no
build step): `fetch-articles`, `minify-css`, `optimize-images`, `build-client`, `set-asset-version`, `sync-head`, `hash-sw`, `preflight-check`, `serve-static`,
`behavior-check`, `fouc-check`, `dom-diff`, `responsive-check`, `measure-gaps`, `section-heights`, `experience-accordion-check`, `perf-probe`, `baseline-capture`
plus shared helpers `scripts/lib/{build-hash,browser,console}.ts` (Artisan-style status lines, one browser launcher). They are ESM (`scripts/package.json`), use `.ts` relative
imports and **only erasable syntax** (no enums / namespaces / parameter properties — Node strips types, it does not transform them). `astro.config.ts` and `vitest.config.ts`
replace the `.mjs` configs. Left as they are by convention: `eslint.config.mjs` and the shell wrappers (`build.sh`, `deploy.sh`, `build-css.sh`, `lh-*.sh`, `setup-fonts.sh`).
Outputs were compared with the old scripts: `styles.min.css`, `critical.min.css` and `src/legacy/index.html` byte-identical, asset/service-worker hashes identical, behaviour-check
JSON identical, dom-diff `A=B` identical.
