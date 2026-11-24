# 60 — Browser runtime ported to TypeScript

**Date:** 2026-11-24 · **Status:** applied (uncommitted until the owner says so)

## Context
`docs/aidlc/54` says every hand-written script is strict TypeScript. Doc 55 had parked the 4,700-line legacy browser
runtime (`public/assets/js/*.js`, `sw.js`) under "Phase 4". The owner pointed out that this leaves `skills-flat.js` and the
rest as plain JS against the rules, so the whole runtime moved now — behaviour unchanged, Alpine still in place.

## What changed
| Before | After |
|--------|-------|
| `public/assets/js/{app,motion,data,editorial,reveal,loader,icons,blur-reveal,liquid-hero,skills-flat,aurora,boot}.js` + `public/sw.js`, minified by `scripts/minify-js.js` | `src/client/*.ts` entries (+ `src/client/lib/**` modules, `src/client/types/runtime.d.ts`), bundled by `scripts/build-client.mjs` (esbuild, IIFE, minified, es2019) to the same `public/assets/js/<name>.min.js`; `src/client/sw.ts` → `public/sw.js` |
| `minify-js.js` step | removed from `build.sh` |
| `boot.js` / `sw.js` stamped in `public/` | `scripts/set-asset-version.js`, `sync-head.js` stamp `ASSET_V` in `src/client/boot.ts`; `hash-sw.js` stamps `CACHE_VERSION` in `src/client/sw.ts`; `build.sh` runs `build-client` before the hash, after the stamp, and once more after `hash-sw` |
| unminified source `.js` files deployed next to the bundles | gone (smaller `dist/`); `public/sw.js` and `*.min.js` are build outputs (gitignored) |

Build order: `…optimize-images → build-client → set-asset-version → build-client → sync-head → hash-sw → build-client`. The content
hash therefore covers the freshly generated bundles, and `boot` / `sw` always carry the stamped value.

## Structure
- `app.ts` → `lib/app/*` (nav pill, hero card, clock, menu, scroll lock, hash, contact modal, touch reveal, tint, roles…);
  `motion.ts` → `lib/motion/*` (spring, pointer effects, hero + element parallax, pill reflow / flip / tap, decor, touch);
  `data.ts` → `lib/hydrate.ts` (pure, shared with the parity test) + `lib/siteMeta.ts`; `icons.ts` → `lib/iconCatalog.ts`.
- Template-facing Alpine members (`x-data`, `@click`, `x-text` in `src/legacy/index.html` and the Astro sections) kept their
  names; only underscore-prefixed internals were renamed (lint forbids leading underscores).
- Shared global shapes live once in `src/client/types/runtime.d.ts`; each file declares the `Window` members it publishes.
- `src/client/package.json` (`"type": "module"`) stops esbuild wrapping every module in lazy `__esm` helpers (≈ −2.6 KB total).
- Duplication removed on the way: `data.ts` now reuses `brands.json`, `deriveUiTint`, `readableForeground`, `tenure`, `ExperienceGrouper`,
  `BrandResolver` from the Astro side instead of keeping a second copy of the tables and algorithms.

## Measured bundle sizes (minified, bytes)
| bundle | before | after |
|--------|--------|-------|
| app | 16,114 | 17,483 |
| motion | 15,784 | 18,047 |
| data | 14,894 | 15,393 |
| editorial | 11,869 | 10,556 |
| icons | 31,194 | 30,643 |
| aurora / blur-reveal / liquid-hero / loader / reveal | 2,980 / 3,692 / 3,448 / 3,135 / 4,128 | 2,966 / 3,116 / 3,568 / 2,930 / 3,958 |
| skills-flat | 3,212 | 3,021 |
Longer meaningful identifiers (esbuild does not mangle property names) make `motion` +18 % and `app` +8 %; total gzip impact is a few
hundred bytes. If that ever matters, `esbuild --mangle-props` for private fields is the lever.

## Lint debt
None waived: every converted function passes `complexity ≤ 10`, `id-length ≥ 2` and the naming rules (large functions were split, not
disabled). Not every lint rule is a behaviour proof — see Verification.

## Verification
`tsc --noEmit` and ESLint clean over `src/client`; parity tests: `legacyPortfolioParity` now imports the pure `hydratePortfolio`, `legacyIconParity`
bundles `src/client/icons.ts` with esbuild and compares its `window.iconSvg` to `IconService` over every icon × class variant (93 parity tests green).
Browser gate (built `dist/`, Chrome): `behavior-check.mjs` reports `problems: []` (accordion, editorial tabs/search, skills, stats, modal),
`fouc-check.mjs` OK, 172 unit/parity tests green, and a fresh page load at 1280 and 390 px shows no page errors, no console errors, no
failed or 4xx requests, and the service worker registers. The porting agents themselves only verified by reading and VM comparisons, so this run is
the real gate; hover-heavy effects (pill FLIP, tilt, parallax) are covered by code review, not pixel diffs — eyeball them once before deploy.

## Still plain JS / HTML
`public/assets/js/vendor/alpine.min.js` (third-party), `src/legacy/index.html` (the page the Astro sections are carved from, shrinks as slices move to
Astro/Preact), and the Node build tools in `scripts/*.js|mjs` (not shipped). Alpine itself and its `'unsafe-eval'` CSP requirement go with Phase 4
(doc 55): the next slices replace `portfolioApp` / `editorialHelpers` with Preact islands, now that their code is typed and modular.
