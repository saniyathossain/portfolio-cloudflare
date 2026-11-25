# 51 — CV v9 sync, stack-focused copy, icon-only pills, local dev

**Date:** 2026-11-24 · **Branch:** `develop` (uncommitted at time of writing)

## Context

The owner supplied the latest CV (`Mohammad-Saniyat-Hossain-CV-v9.md`) and asked for the whole site to be
re-synced from it. Follow-up decisions in the same session reshaped the copy direction:

1. **No years-of-experience figure anywhere** ("14+ years" removed from hero, About, subtitles, OG text, stats).
2. **No headline numbers in prose** — user counts, student counts, percentages and table sizes removed. The copy
   is **stack-focused**, not number-focused.
3. **Only pills with a real brand icon** — stack/skill names that would render as a letter monogram are dropped
   from pill rows (they may still appear in prose and highlight terms).

## Source of truth

- `docs/cv-modern-template.md` is now a verbatim copy of CV v9 (it keeps the CV's own figures — it mirrors the CV,
  the site deliberately does not).
- `public/assets/data/portfolio.json` mirrors it, with the copy rules above applied.

## Content changes (`portfolio.json`)

| Area | Change |
|------|--------|
| `experiences` | 8 → **7** roles. `bs23-contract` (Oct–Dec 2020) merged into `bs23-senior`, now **Oct 2020 — Dec 2021** (v9 lists one role). Staff role details are prefixed per project — *Focus Learning Platform*, *SB7*, *Ecom Intelligence*, *MyGP Back-End Squad* — following the existing "Project — …" detail convention. Stacks follow each role's v9 `Tech:` line. |
| `aiTools` | Kept on the two latest BS23 roles (v9 lists AI tools only under Core Skills). "Copilot" → **GitHub Copilot**. |
| `skills` | Regrouped to six panels: Languages · Frameworks · Data & messaging · Platform & infra · Testing & tools · AI in the flow. **Go** and the IDE "Tools" group removed (absent from v9). |
| `stats` | `years` tile → **"30+ Stacks in production"** (`icon: "stacks"`). `roles` tile 4 → **3** (BS23 now has three roles). |
| Copy | `site.description`, `aboutHeading`, `aboutKicker`, `aboutLead`, `ogDescription`, `sections.experience`, `sections.skills`, `heroCards` (Focus → "Backend & solution architecture at scale", AIDLC → **AI-DLC**), `profile.heroRatingTail` → "PHP, Laravel, Node.js, MySQL, Redis & microservices". |
| `education` | Subject "Electronics and Telecommunication Engineering"; "Motijheel Government Boys' High School". |
| `experienceHighlights` | Added Laravel Horizon, Cassandra, MongoDB, Backend-for-Frontend, AI-DLC, queues; removed Go/AIDLC. |

### Dropped from pill rows (no icon in `public/assets/img/brands/`)
SQL, MongoDB, Cassandra, PHPUnit, Pest, PHPStan, REST API, FlightPHP, AI-DLC, and architecture/practice terms
(REST API Design, Monolith Decomposition, API Gateway, Backend-for-Frontend, Change Data Capture, Event-Driven
Design, Role-Based Access Control, Solution Design, Code Review, Performance Optimization, Refactoring).
**Laravel Horizon** stays (Laravel mark); **GitHub Copilot** stays (Copilot mark). To restore any of the dropped
ones, add a local SVG under `public/assets/img/brands/` and a `BRANDS` + `_TAHOE_PILL_TINTS` entry in `data.js`.

## Code changes

- `data.js` — `BRANDS` / `_TAHOE_PILL_TINTS` gain `"github copilot"` and `"laravel horizon"` aliases.
  `profile.heroRating` is now just `heroRatingTail` (no `"{years}+ years · "` prefix).
- `scripts/sync-head.js` — `buildHeroRating()` mirrors that (static `<!-- SYNC:H1 -->` line has no years).
  `{years}` templating still exists and works; no copy currently uses it.

## Gotcha: cache-busting needs `set-asset-version.js`

Running only `minify-js.js` + `sync-head.js` leaves the `?v=` stamp unchanged, so browsers keep the old
`data.min.js` (observed: Copilot pill rendered a monogram until the stamp moved). After **any** JS/CSS edit run
`./build.sh`, or at minimum `node scripts/set-asset-version.js` before `sync-head.js` + `hash-sw.js`.

## Local dev

- `.claude/launch.json` — `wrangler-dev` config: `npx --yes wrangler dev --port 8787 --ip 127.0.0.1`.
- Port **8080 conflicts with OrbStack** on this machine (it binds `127.0.0.1:8080`; a Python server there only
  gets IPv6 → `ERR_CONNECTION_REFUSED`/redirect in the browser). Use 8787 (Wrangler) or another free port.

## Verification

Local preview (`wrangler dev`, SW + caches cleared): 7 roles / 5 companies, 34 skill pills with **zero** monogram
fallbacks, 22 Staff-role tags all iconed, no years/figures in rendered text, stats count-up OK, no console errors.
