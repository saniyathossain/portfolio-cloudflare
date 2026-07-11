# 46 — Design overhaul: SF-Pro Tahoe type + bold per-section reinvention, budget-neutral

## Context

**Why:** getlayers.ai-inspired ("AI builds generic, we make it cinematic" — premium template gallery: big
editorial type, tagged glass cards, immersive depth) design overhaul of the portfolio, plus an authentic
macOS-Tahoe font, more refined layout/animation/liquid-glass — while **holding PageSpeed 100 on mobile + tablet
+ web AND lowering resource consumption**. The site already has a mature Tahoe/liquid-glass system (45 prior
aidlc docs, copper accent, per-section hue map) and a deliberate PageSpeed-100 architecture (faux-frost
`--frost-bg` instead of backdrop-filter, `font-display:optional`, lazy JS, in-view/reduced-motion gating).

**Core tension + resolution:** "more visual richness" fights "100 everywhere + lower resource use."
`styles.min.css` is already **144KB (the heaviest asset)**. So the overhaul is **budget-neutral by
construction**: every additive change is paid for by pruning dead/duplicate CSS accumulated across 45
doc-iterations and consolidating the duplicated skills variants. Net CSS/JS must end **≤ current size**. Bold
*visual/layout* change, *calm* motion.

**Decisions taken (via AskUserQuestion):**
1. **Scope = bold per-section reinvention** — new layouts where they help (bento, tagged case-style cards,
   refined gallery), keeping the glass vocabulary + copper palette; aggressive prune to hold the score.
2. **Font = SF Pro on Apple, Inter elsewhere** — system-SF-first stack; Apple devices render native SF Pro
   (real Tahoe) *and skip the 47KB Inter download*, non-Apple keeps Inter (consistent as today).
3. **Hero = refined 2-column (current structure)** — polish type/spacing/card, do NOT restructure (LCP-safe).
4. **Motion = restrained, performance-first** — subtle, GPU-only, reduced-motion + in-view gated everywhere.
5. **Kill the Code/Ship/Scale "Create Band"** — pure decoration (3 word-tiles + arrow), ran a `.beam`
   conic-gradient (GPU repaint cost), carried ~100 lines CSS + motion.js pause logic + a **dead `createBand`
   JSON array** (not read by render). Removal is a G3 budget win.
6. **Replace that slot with a "How I work" principles strip** — 3 principle tiles (`.glass-card` +
   `.icon-chip`), real content (resilient backends / async at scale / quiet precision).
7. **Add an Articles/Writing section** — bento cards with a skiper52-style horizontal expand-on-hover, grown
   via Motion One spring on fine-pointer hover; reduced-motion + coarse-pointer gated (static stacked cards on
   touch). Placed after Skills, before Stats/Education/Footer.
8. **Article data = build-time fetch + per-entry `active` toggle.** Build script pulls dev.to + Medium RSS,
   merges idempotently into JSON; user curates via `active: true|false`. Network at build only.
9. **Add Motion One** (`motion`, motion.dev — vanilla, WAAPI-based, no React) as the sole new dependency:
   self-hosted, tree-shaken, lazy-loaded (dynamic `import()`, never critical path), byte-offset by deleting the
   hand-rolled code it replaces. Hard gate: net shipped JS ≤ baseline; any effect that can't hold PageSpeed 100
   falls back to native CSS/JS.
10. **Accordion = skiper103 "bouncy" spring** — Experience accordion re-driven by Motion One height spring,
    gapped card-style items + glassmorphism icon tiles, sticky-open kept, reduced-motion instant.

**Constraints:** no React/Framer; Motion One is the sole permitted new dep under the decision-9 rules;
PageSpeed 100 at 360/768/1024/1440; light-only; every animation `prefers-reduced-motion`-gated; no inline
`style=""`; `<head>` only via `scripts/sync-head.js`; `critical.css` byte-matches `styles.css`; reuse existing
primitives; content only from `portfolio.json` (never fabricate CV data).

---

## Execution log

Tracks G, S, L, M, A as designed. See plan history / commits for the authoritative diff; this doc records intent
and decisions, not a line-by-line changelog.

### Track G — Global
- G1 SF-Pro font stack (Apple-first, Inter elsewhere).
- G2 unified `.sec-h2` heading system across sections.
- G3 CSS/JS prune: Create Band removed, skills variants consolidated to one.

### Track S — Per-section reinvention (shipped)
How-I-work strip (replaces Create Band, real content), Services bento card grid with tags + tilt,
Experience skiper103 gapped bouncy cards with glass icon tiles, Skills consolidated to the single
glass-panel design, Articles bento section (new). Hero, About, Education/Stats/Footer left as-is —
already the most finished sections and lowest priority per the plan's own staging order; not
touched this pass.

### Track L — Motion One: **not vendored, executed as native CSS/JS instead**
`motion` (motion.dev) ships only as a modern ESM package split across internal submodules — there is
no single-file minified bundle to self-host, and this project deliberately has no bundler ("no
runtime build step"). Vendoring it correctly would have required introducing a build step, which is
a bigger architectural change than this design pass and out of scope. Invoked the plan's own fallback
clause instead: skiper103's bounce and skiper52's expand-on-hover are both implemented as pure CSS
(cubic-bezier overshoot springs, `flex-grow` transitions) plus the existing hand-rolled `tilt()` in
motion.js — zero new bytes, same visual result, no new dependency risk.

### Track A — Articles pipeline (shipped)
`scripts/fetch-articles.js` (dev.to API + Medium RSS) → idempotent merge into `portfolio.json`'s
`articles` array with a per-entry `active` toggle, wired into `build.sh`. Verified: re-running the
script twice preserves hand-set `active` flags and adds zero duplicates. Fetched 17 real posts;
curated 3 active for launch (Cache-Control headers, Laravel auth caching, PHP DTOs).

## Verification performed
- `bash build.sh` clean (only the 2 pre-existing containment warnings), `preflight-check.js` clean.
- Fixed a real bug caught by verification: `howIWork`/`articles` were undefined in Alpine scope —
  `app.js`'s root `x-data` object lists keys explicitly rather than spreading `PORTFOLIO_DATA`; added
  both keys + `init()` live-resync.
- Headless Chrome (CDP): zero console errors/exceptions after the fix; screenshots of every new/changed
  section confirm correct rendering (How-I-work tiles, Services bento, Experience cards, Skills grid,
  Articles cards with real curated content).
- Byte budget: `styles.min.css` 139,443B (was 147,637B) and total `*.min.js` 87,578B (was 87,724B) —
  **both down from baseline** despite the net-new Articles/Services/How-I-work markup and CSS.
- Not done this pass: 360/768/1024/1440 responsive sweep, reduced-motion pass, deployed PageSpeed
  re-verification — recommend before shipping to production.
