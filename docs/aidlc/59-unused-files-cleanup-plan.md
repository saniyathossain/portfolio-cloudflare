# 59 — Unused files: audit, plan and first removals

**Date:** 2026-11-24 · **Status:** tier 1 applied, tiers 2–3 await the owner's go

## Method
Three passes over the tracked tree (skill / agent folders and parity baselines excluded):
1. **Reference scan** — every tracked file's name and stem searched across all other tracked text files (301 files, 12 candidates).
2. **Export scan** — every exported symbol in `src/` and `tests/` searched for importers elsewhere.
3. **Asset scan** — every brand SVG against `brands.json` / legacy JS, every logo against `portfolio.json` / CSS, `.min.*` / FILES lists against disk.

Findings were then checked by hand; name-matching alone would flag config and `.d.ts` files (`eslint.config.mjs`,
`src/env.d.ts`, `.prettierrc.json`…), which are used implicitly and stay.

## Tier 1 — removed now (committed files, one-off debugging tools, no references anywhere; recoverable from git)
| File | Why it existed | Why it is dead |
|------|----------------|----------------|
| `scripts/boundary-shot.mjs` | screenshot a section seam while debugging the card-shadow cut | root cause fixed (doc 56); its metric was flawed |
| `scripts/pill-frames.mjs`, `scripts/pill-probe.mjs` | frame capture / probing of the pill label reveal | tuned and shipped; superseded by `behavior-check.mjs` |
| `scripts/measure-heading-gaps.mjs` | title / subtitle gap numbers | superseded by `measure-gaps.mjs` (layout-based, documented in README) |
| `minify-js.js` → `"skills-scroll.js"` entry | file list for esbuild | the file no longer exists (the loop skipped it silently) |

Kept on purpose: `section-heights.mjs` (regenerates the `contain-intrinsic-size` placeholders whenever section content
changes), `baseline-capture.mjs` (referenced by the parity baseline README), `lh-matrix.sh`, `lh-runs.sh`, `perf-probe.mjs`,
`fouc-check.mjs`, `behavior-check.mjs`, `dom-diff.mjs`, `measure-gaps.mjs`, `responsive-check.mjs`, `serve-static.mjs`.

## Tier 2 — candidates, need the owner's decision
| File | Evidence | Recommendation |
|------|----------|----------------|
| `public/_headers` | The Worker (`run_worker_first`) sets every header and cache rule; this file only matters for a host that does not run the Worker. Referenced by docs 03 / 43 / 54 | delete once nobody previews with a plain static server; otherwise keep and treat the Worker as source of truth |
| `docs/REBUILD-PLAN.md`, `docs/design.md`, `docs/template-prompt-getlayers.ai-lumora-template.md` | only reference each other (and doc 06); superseded by `docs/aidlc/` | move into `docs/aidlc/assets/archive/` or delete; `cv-modern-template.md` stays (content source of truth) |
| Unnecessary `export` on file-internal symbols (≈ 30, e.g. `ErrorPageRequest`, `ContactMail`, `GUARD_STATUS`) | each used only inside its own file | drop the keyword when touching the file next; no behaviour change |
| Type exports with no importer: `Profile`, `Company`, `Article`, `SkillGroup`, `Partner`, `NavItem`, `BrandEntry`, `ErrorPage`, `BotSignature` | public DTO vocabulary | keep (cheap, documents the shapes) |

## Tier 3 — goes away with Phase 4 (doc 55), not before
`public/assets/js/{app,motion,data,editorial,reveal,loader,icons,blur-reveal,liquid-hero,skills-flat,aurora,boot}.js`,
`public/vendor/alpine.min.js` and the inline Alpine directives in `src/legacy/index.html` are all live today; each file is
deleted in the slice that ports it to TypeScript / Preact. Tailwind's generated `tailwind.css` and every `*.min.*` file are
build outputs (gitignored), not sources.

## Not unused (checked)
All 55 brand SVGs are referenced by `brands.json` (including `go.svg` through the `go` / `golang` entries); all 13 logo
files are referenced by `portfolio.json` (PNGs are the sources `optimize-images.js` turns into WebP); `migrations/` backs the
optional D1 log channel; `skills-lock.json` pins the design skills; `src/legacy/index.html` is the page the Astro sections
are carved from.
