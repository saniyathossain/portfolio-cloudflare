# 55 — Phase 4: React islands replace Alpine (plan + progress)

**Date:** 2026-11-24 · **Status:** in progress · Continues doc 53 (§3 "React islands", §6 phase 4). Standards: doc 54.

## Why this is its own document
`public/assets/js/app.js` (928 lines), `editorial.js` (533), `skills-flat.js` (143) and `boot.js` hold the whole stateful UI, and
they carry many deliberate, hard-won timing behaviours (scroll-lock sequence, menu → modal hand-off, accordion height
animation, nav pill, hero contrast sampling, hash navigation, liquid-warp pulse, popover touch logic, Turnstile lazy load).
A faithful port is done **slice by slice**, each verified against the legacy page before the next starts — never big-bang.

## Rules for every slice
1. Same markup and class names as the legacy DOM (`scripts/dom-diff.mjs`, islands are unwrapped from `<astro-island>`).
2. Same behaviour: `scripts/behavior-check.mjs` reports are identical to legacy at 1440 and 360 px, no console errors.
3. No first-visit flash (`scripts/fouc-check.mjs`), no performance loss (`scripts/lh-runs.sh`, `scripts/perf-probe.mjs`).
4. Values come from JSON (`ui.json` `behavior`/`clock`, `portfolio.json` `copy`), logic from code (doc 54 §1a).
5. Pure logic lives in `src/lib/` with unit tests; the island is a thin view (`src/islands/`).
6. One commit per slice, only on the owner's go-ahead.

## Architecture
- **Islands** (`src/islands/*.tsx`, wrapped by `src/components/sections/*Island.astro`): hydrated with `client:idle`
  (visible-above-fold shell) or `client:visible` (below the fold).
- **Shared UI state** (menu / modal / scroll lock) goes in a small nanostores store (`src/stores/`), and **static triggers**
  (hero CTAs, nav buttons, footer CTA) become `data-action="open-modal"` / `data-nav-target="education"` attributes handled by
  one delegated listener — no framework needed for a button, and it replaces the Alpine `x-on:click` calls.
- **Non-stateful effects** (`motion`, `reveal`, `blur-reveal`, `aurora`, `liquid-hero`, `loader`, nav pill, hero contrast)
  become plain typed modules under `src/scripts/`, with the same idle/desktop/reduced-motion gating.
- **Alpine is removed last**, after the final Alpine-bound fragment is gone: then `'unsafe-eval'` leaves the CSP.

## Slice order (low risk → high risk)
| # | Slice | Replaces (Alpine) | Status |
|---|-------|-------------------|--------|
| 0 | Toolchain: `@astrojs/react`, `react`, `react-dom`, `nanostores` | — | done |
| 1 | `BackToTop` island | `showBackToTop`, `scrollToTop`, `setupBackToTop` (button part) | done |
| 2 | `HeaderClock` island (+ `lib/clock.ts`) | `tickClock`, `initClockSweep`, `clock*` state | done |
| 3 | Hero card carousel (`HeroCards`) | `cardIndex`, `cardStep`, `_finishSwap`, `setupHeroBadgeCarousel` | next |
| 4 | UI shell: store + delegated actions + `NavOverlay` + scroll lock | `menuOpen`, `openMenu/closeMenu`, `scrollLock`, `navGo`, `syncCloseBtn`, hash navigation | |
| 5 | `ContactModal` (form, Turnstile lazy load, under-construction notice) | `modalOpen`, `submitForm`, `_loadTurnstile`, `uc()` | |
| 6 | `ExperienceAccordion` | `toggleRole`, `_animateHeight`, `openRoles/openedRoles` | |
| 7 | `SkillsFlat` toggle | `skillsFlatPanel()` | |
| 8 | `Editorial` (tabs, search, filter swap, dock/lens, count tickers) | `editorialHelpers()` | |
| 9 | Plain-TS effect modules + nav pill + hero contrast | `setupNavPill`, `setupHeroContrast`, `setupIdlePause`, legacy `motion.js`… | |
| 10 | Remove Alpine, `boot.js`, `data.js`, `icons.js`; drop `'unsafe-eval'` | — | |

## Interop while both exist
Alpine and React own **disjoint DOM regions**; Alpine's init walk ignores island markup (no `x-` attributes). Where Alpine still
needs a value an island now owns (e.g. the overlay's "Local time" text), it keeps its own copy until that slice lands.

## Progress log
- **2026-11-24 slices 0–2:** toolchain added; `BackToTop` and `HeaderClock` islands replace their Alpine counterparts. The
  clock's labels, tick rate and the back-to-top threshold come from `ui.json` (`clock`, `behavior`) and `copy`.
