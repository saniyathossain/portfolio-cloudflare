# 63 — Progressive edge blur, squircle corners, modal liquid glass

**Date:** 2026-11-25 · **Status:** applied (uncommitted until the owner says so)

Owner ask: more macOS "liquid glass" feel on the home page, the contact modal (responsive) and the outage page, with
no performance loss and no behaviour change. Reference reviewed: `bilalgursen/liquid-glass` — a React/Tailwind set whose
glass is one WebGL2 shader over a DOM snapshot; **not adopted** (continuous GPU work, snapshot cost, React-only; same
conclusion as doc 56). Only its ideas were taken, as static CSS.

## Changes (all in `styles.css`; `critical.css` mirrors the above-the-fold hero card)
| Change | How | Cost |
|---|---|---|
| Progressive blur, top | `.site-header::before`: fixed strip, one 9 px blur faded by an alpha mask; shown only while the header pill has `.is-scrolled` (`:has()`), opacity 0 at the top of the page | none at load |
| Progressive blur, bottom | `html::after`: fixed 4.5 rem strip, 8 px blur masked; opacity driven by scroll-driven animation, fades out near the page end so the dark footer is never blurred | none where `animation-timeline` is unsupported (strip simply never shows) |
| Squircle corners | `corner-shape: squircle` inside `@supports` on `.glass-panel`, `.glass-card`, `.hero-card` (+ inner), `.modal-panel` and the outage `.window`; pseudo-elements that use `border-radius: inherit` also get `corner-shape: inherit` | none |
| Modal liquid glass | `.modal-panel` was solid `#fff`; now a translucent fill over a specular border-box rim plus inset/drop shadows (same recipe as the outage dialog). No panel `backdrop-filter`: a child of `.modal-backdrop` (itself a backdrop root) would only see the backdrop, so the existing 16 px page blur does the work | none |
| Legibility on glass | modal field labels and title-bar label alpha .5 → .62 | none |

DESIGN.md rule (real `backdrop-filter` only on small fixed chrome) is kept: both edge strips are fixed, non-scrolling and
invisible until the page scrolls. Fallback everywhere is the previous look.

## Verification
- Lighthouse mobile A/B, strips removed vs present, 4 interleaved runs each: perf 100 / TBT median ≈ 58 ms (off) vs ≈ 46 ms (on) —
  no regression (Lighthouse does not scroll, so the strips are at opacity 0 during the run).
- Screenshots at 1440 / 768 / 390 px: modal glass + squircle render correctly (`getComputedStyle().cornerShape` =
  `superellipse(2)`), top strip blurs content under the header, bottom strip off at the page end and footer is clean.
- 114 unit tests, `tsc`, `astro check`, ESLint clean; `behavior-check` `problems: []` at 1440 and 390; FOUC guard OK;
  impeccable detect: no undersized-text / low-contrast findings.

## Not done (candidates)
Radius scale with concentric inner radii (`calc(outer − padding)`) — 12+ ad-hoc rem values exist; mobile bottom-sheet
modal (larger top radius, `env(safe-area-inset-bottom)`, spring scale); conic specular rim and bottom caustic on cards.
