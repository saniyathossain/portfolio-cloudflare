# 62 — Code audit: package replacement, DRY, structure

**Date:** 2026-11-25 · **Status:** applied (uncommitted until the owner says so)

Owner ask: are all the TypeScript files needed, can packages replace any, and can the layout be made easier
(components/libraries, Laravel-style) with enums/DTOs/types/DRY/SOLID — **without any performance or behaviour change**.

## Verdict on packages
| Area | Decision | Why |
|---|---|---|
| Client effects (`src/client`, 48 KB minified in total) | keep hand-written | GSAP/motion would add more than the whole bundle |
| `UserAgentParser` (Worker) | keep | `ua-parser-js` ≈ 20 KB, hurts Worker cold start |
| `src/lib/color.ts` | keep | build-time only, no runtime cost to remove |
| Rate limiter | keep | already the Cloudflare binding |
| `scripts/optimize-images.ts` | **swapped to `sharp`** | was `cwebp` + ImageMagick + `sips` CLIs; now portable, no system tools |
| `scripts/fetch-articles.ts` | **global `fetch`** | replaces a 35-line `node:https` redirect/timeout wrapper |
| `scripts/minify-css.ts` | **kept** (tried `lightningcss`) | see below |

### `lightningcss` rejected (measured)
12 % smaller CSS, but a computed-style diff of the whole page (3 648 element/pseudo rows at 390 and 1280 px) showed
a real regression: with or without browser targets it **dropped the unprefixed `backdrop-filter`** declarations
(kept only `-webkit-`), so the header glass pill lost its blur in Chrome. The hand-written minifier output is
byte-identical to before, so it stays.

### `sharp` equivalence (measured)
Forced a full regeneration: 760w/840w hero WebPs, 512 icon and four logos came out **byte-identical** to the committed
`cwebp` output; the rest differ only because the committed files were generated with older settings. The committed
derivatives were restored, so nothing user-visible changed; the cache (`scripts/.img-cache.json`) skips regeneration
until a master image changes.

## DRY / structure changes
- `src/lib/browser/reducedMotion.ts` — single `REDUCED_MOTION_QUERY` + `prefersReducedMotion()`; replaces 9 inline
  `matchMedia("(prefers-reduced-motion: reduce)")` copies (loader, reveal, blur-reveal, boot, aurora, liquid-hero,
  motion environment, HeroCards island, effects constants). Same query, same read time → same behaviour.
- `src/enums/ShellAction.ts` — string enum for the delegated `data-action` values (open/close modal, menu, nav-modal,
  scroll-top …) used by `actions.ts`, the islands, `navTriggerAttributes` and the footer CTA. Rendered HTML is unchanged.
- Worker-only helpers moved out of the shared lib: `src/lib/{controlCharacters,timingSafeEqual}.ts` →
  `src/worker/support/` (docs 57/58 paths updated).

## Not done (follow-up candidates, behaviour-risky or large)
Split `editorialMotion.ts` (441 lines), `pillFlip/pillReflow.ts` (~340) and `ContactController.ts` (332: pull validation
and mail dispatch into their own classes). Each needs its own before/after verification.

## Verification
`npm run build` exit 0 · 114 unit tests · `tsc`, `astro check`, ESLint clean · `behavior-check` `problems: []` at 1440
and 390 px · FOUC guard OK · built HTML keeps every `data-action` value (`open-modal`, `close-menu`, `nav-modal`, …).
