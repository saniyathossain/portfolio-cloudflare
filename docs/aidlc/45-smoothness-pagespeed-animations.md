# Plan 45 — Kill sluggishness + PageSpeed 100 desktop, then skiper-style animations

## Execution status (Phase 1 shipped, uncommitted; Phase 2 not started)

| # | Item | Outcome |
|---|---|---|
| A1 | Nav glass blur 50px→18px, saturate 215%→190% (desktop + mobile coarse-pointer cap 32px→16px) | **Done** — styles.css + critical.css mirrors |
| A2 | Loader intro: drop `filter: blur()` transition, keep `transform: scale` + scrim opacity | **Done** — styles.css/critical.css rule + loader.js (`BLUR_MAX` const + `--load-blur` writes removed) + index.html inline bootstrap script |
| A3 | `body::before` aurora blur 28px→14px | **Done** |
| A4 | Aurora canvas composite blur 44px→26px | **Done** |
| A5 | `brand-bismillah` sheen: drop `drop-shadow()` from the animated keyframe (kept on hover/focus, a discrete state not a loop) | **Done** |
| A6 | Hero beams 3→1 simultaneous (dropped `.beam` from the 2 hero CTA buttons; kept on hero-card; buttons keep `.sheen`) | **Done** — verified via CDP: beam count 9→7 site-wide |
| B1 | Parallelize boot: prefetch `app.min.js`+`alpine.min.js` bytes in parallel with the `portfolio.json` fetch, execution order unchanged (app.js reads `window.PORTFOLIO_DATA` synchronously at parse time, so execution order is a real constraint, not just habit) | **Done** — boot.js |
| B2 | Pre-bake static icons at build | **Skipped, documented** — same call as plan-43: baking literal SVG into `index.html` in place of `x-html="iconSvg(...)"` is not reversible/idempotent (no clean attribute left to re-scan on the next build), unlike everything else in this pipeline which regenerates from `SYNC:*` markers backed by `portfolio.json`. Measured runtime cost is small (~117 pure string-concat calls, no DOM/layout work) next to Alpine's own init. Architectural risk didn't clear the bar twice now. |
| B3 | `content-visibility: auto` + `contain-intrinsic-size` on `#about`/`#services`/`#experience`/`#skills`/`#education` (excludes `#home`/hero — LCP element) | **Done** — sizes are REAL measured heights via headless-Chrome CDP at 1440px and 390px (not guessed), desktop + mobile-breakpoint override. Verified post-build: `#experience` renders at exactly 1803px, matching the placeholder — no CLS surprise. |

**Verification performed:** `bash build.sh` clean (2 expected pre-existing containment warnings), `preflight-check.js` OK, single-hash invariant holds (`2ff847ba5c06` across index.html/boot.js/src/index.js), `git status --short` diff scope matches exactly what was touched. Live headless-Chrome CDP check: header/hero ready, Alpine initializes and reacts (clock ticking), nav renders, section heights match measured placeholders. **Not committed** — awaiting explicit permission, per standing instruction.

**Not done this pass:** Phase 2 (the 4 skiper-style animations — tooltip/form/accordion/hero-stack) — sequenced after Phase 1 per the plan; not started. Real desktop PSI re-measurement is blocked on the same PSI API quota exhaustion noted in the Context below — verify post-deploy.

---

## Context

**Why:** Deployed site feels sluggish and scores ~60 desktop Lighthouse (was ~92 — regression). User also wants
4 new animations modeled on skiper-ui refs (all Framer Motion + React; cannot import — recreate the *feel* in the
site's existing vanilla CSS + hand-rolled rAF-spring). Three parallel Explore audits established that **sluggish
scroll** and **PageSpeed 60** are two SEPARATE problems with different causes:

- **Felt scroll lag = always-on GPU paint** (backdrop-filter, canvas, conic beams) — hurts runtime FPS/INP, not
  Lighthouse TBT.
- **PageSpeed 60 = main-thread JS** (serial boot chain, Alpine whole-page init, ~117 runtime `iconSvg()` builds) —
  hurts TBT, not scroll FPS.

Fix both, separately. **Prime regression suspect:** recent liquid-glass nav work set `.glass-pill`
`backdrop-filter: blur(50px)` (styles.css:989) which re-blurs the whole page behind the fixed header every scroll
frame — the single largest steady-state paint cost, and not motion-gated.

**Decisions taken this session:**
1. Nav glass → **best-practice 60fps GPU approach**: keep the see-through liquid glass but drop the blur radius to a
   GPU-cheap value (~16–20px) and saturation (215%→~160%), keep the element promoted to its own compositor layer
   (existing `transform: translateZ(0)`). Measure real FPS; fall back to faux-frost only if a low-radius live blur
   still can't hold 60fps. (Framer-motion-grade smoothness = only transform/opacity animate; large live blur on
   scroll is the anti-pattern being removed.)
2. **Perf first (Phase 1), then animations (Phase 2).**
3. skiper52 → **hero cards stagger-in** (staggered layered reveal on load, transform/opacity, LCP-safe).

**Constraints (carried):** no React/Framer/new deps; PageSpeed 100 both form factors; light-only; every animation
`prefers-reduced-motion`-gated; no inline `style=""`; `<head>` only via `scripts/sync-head.js` markers; `critical.css`
byte-matches `styles.css` for mirrored rules; commit only on explicit permission, staged by name (never
`.impeccable/`/`-A`). Live PSI desktop metric breakdown was unobtainable (PSI API quota exhausted) — targeting is
inferred from the audits (TBT-dominant); confirm post-deploy.

---

## Phase 1 — Smoothness + PageSpeed 100 (do first)

### Track A — cut always-on GPU paint (scroll smoothness)

| # | Change | file (mirror critical.css) | Note |
|---|--------|------|------|
| A1 | **Nav glass blur 50px→~18px, saturate 215%→~160%** in `.glass-pill` + `.glass-pill.is-scrolled` | styles.css:989, :1022 + critical.css twins | #1 win. Keep see-through + promoted layer. Verify 60fps via CDP; faux-frost fallback only if needed. |
| A2 | **Loader intro: animate `opacity`/`transform` scale, not `filter: blur()`** on `.app-root` | styles.css:11-16 + loader.js:32-40 | Animating blur re-rasters whole page (non-GPU WebKit). Swap to a GPU opacity+scale settle. |
| A3 | **`body::before` aurora: drop `filter: blur(28px)` to ~14px (or bake blur into the gradient stops)** | styles.css:250-274 (:268) | Large full-viewport filtered layer under everything. |
| A4 | **Aurora canvas: lower composite `blur(44px)`→~26px + cap opacity; keep 24fps + offscreen pause** | aurora.js + styles.css:316-318 | Already gated/paused; just cheaper. Consider static one-shot render as fallback if still heavy. |
| A5 | **`brand-bismillah` sheen: remove `filter: drop-shadow` keyframe; use opacity/transform sheen** | styles.css:1056-1061 | Non-GPU filter anim, always-on in fixed header. |
| A6 | **Hero beams: cut simultaneous conic `beam-rotate` from 3→1** (keep on hero-card, drop `.beam` class from the 2 hero CTAs) | index.html:189,193 + styles.css:3609 | 3 full-ring repaints/frame above the fold. Buttons keep `.sheen`, lose `.beam`. |

All Track-A effects already reduced-motion-gated except the static backdrop-filters (A1) — those repaint on scroll
even for reduced-motion users, which is exactly why lowering the radius (not just gating) matters.

### Track B — cut main-thread JS (PageSpeed TBT)

- **B1 — Parallelize boot** (`boot.js:61-74`): today it awaits `portfolioDataReady` → `app.min.js` → `alpine.min.js`
  serially (~79KB gate). Kick off `app.min.js` + `alpine.min.js` loads **in parallel with** the json fetch
  (`Promise.all`), so Alpine parse/compile overlaps the data round-trip. Alpine still needs data before `x-data`
  eval, but the 46KB parse should not sit *behind* the fetch. Biggest single TBT lever (doc-40 A2, never done).
- **B2 — Pre-bake static icons at build** (doc-43 #5, previously skipped): add a build step + a `<!-- SYNC:ICONS -->`
  discipline so `x-html="iconSvg('arrow','ui-icon…')"` call-sites with **literal** args are replaced at build with
  the inline `<svg>` and the `x-html` attr removed (dropping them from Alpine's directive walk). Keep **dynamic**
  ones (`iconSvg(item.icon,…)` inside `x-for`) as runtime `x-html`. Kills ~26 of the ~117 init builds and, more
  importantly, removes static-icon spans from the Alpine compile. Wire into `build.sh` after `sync-head.js`;
  regenerate `icons.min.js` unchanged (runtime path still needed for dynamic).
- **B3 — `content-visibility: auto` + `contain-intrinsic-size` on below-fold sections** (doc-43 #8): measure each
  section's rendered height first (CDP) to set correct intrinsic sizes (wrong value = CLS). Skips initial
  layout/paint of off-screen sections → lower main-thread render + faster FCP/LCP.

---

## Phase 2 — skiper-style animations (after Phase 1 verified)

All vanilla, interaction-triggered (except D, on-load), transform/opacity/clip-path only, reduced-motion-gated, so
none add load-time TBT. Reuse the existing rAF-spring in `motion.js` and easing tokens (`--ease-spring`, etc.).

- **C1 — Tooltip (skiper43): spring + clip-path reveal.** Upgrade the 3 existing tooltip variants
  (`.brand-tooltip` styles.css:1094, `.popover__panel` :2919, `.partner-orb__tip` :2129) to reveal via
  `clip-path` inset wipe + spring `--ease-spring` scale/translate (they already share the spring ease — add the
  clip-path wipe + unify timing). Pure CSS on `:hover`/`:focus`; touch `.is-open` path already exists (app.js:768).
- **C2 — Form (skiper106): focus spring + animated caret.** Contact modal inputs (index.html:679-681,
  styles.css:3444-3449) currently only fade border-color. Add: label/underline spring on focus, and an optional
  spring-animated caret overlay (canvas text-measure → position a `transform`-springed caret div; native caret
  hidden via `caret-color: transparent`). Reduced-motion → snap. Scope to the 3 modal fields only.
- **C3 — Accordion (skiper103): bouncy overshoot spring.** Experience roles use `_animateHeight` with a flat
  hardcoded `cubic-bezier(0.32,0.72,0,1)` (app.js:698). Swap open to a slight-overshoot spring curve + a springier
  chevron (styles.css:2847). Keep the px-height technique + lazy-mount + transitionend fallback (all solid).
- **D1 — Hero cards stagger-in (skiper52 intent).** On load, reveal hero card + partners as a staggered layered
  stack. Reuse the existing `[data-reveal]`/`[data-stagger]` engine (reveal.js:19-115) — add a "stack" variant
  (scale/translate/blur-overlay per depth) driven by the same IntersectionObserver + double-rAF. Keep the hero H1
  **static/opacity:1 (LCP-safe)** — do NOT animate the headline (prior LCP regression risk).

---

## Critical files
- **Track A / animations CSS:** `public/assets/css/styles.css` + `public/assets/css/critical.css` (byte-match
  mirrored rules) — nav glass, loader, body aurora, bismillah, beams, tooltips, form, accordion, reveal.
- **Track A JS:** `public/assets/js/aurora.js`, `public/assets/js/loader.js`.
- **Track B:** `public/assets/js/boot.js` (parallel load), new `scripts/prebake-icons.js` + `build.sh` wiring +
  `public/index.html` (SYNC:ICONS), `public/assets/js/icons.js` (unchanged runtime path).
- **Phase 2 JS:** `public/assets/js/motion.js` (reuse rAF spring), `public/assets/js/app.js` (accordion ease,
  form caret), `public/assets/js/reveal.js` (stack variant).
- Auto-regenerated: `*.min.css`, `*.min.js`, `boot.js`/head/`sw.js` version stamps.
- New doc: `docs/aidlc/45-smoothness-pagespeed-animations.md`.

## Verification
- **Smoothness (CDP, desktop, motion-on):** record scroll with Performance/paint-flashing before vs after Track A;
  confirm sustained ~60fps on scroll and no full-page paint-flash from the header. Reduced-motion pass.
- **PageSpeed:** `bash build.sh` clean (2 expected containment warnings) + `preflight-check.js`. Post-deploy: PSI
  desktop **and** mobile in incognito must hit/hold 100; compare TBT before/after B1–B3. (Local can't measure the
  CF/edge path.) CLS still 0 after B3 (content-visibility).
- **Animations (Phase 2):** each triggers on interaction only (verify no load-time cost); reduced-motion snaps;
  tooltip/accordion/form still keyboard-accessible; hero stack doesn't delay LCP (H1 stays static).

## Commit grouping (only on explicit permission; stage by name; never `.impeccable/`/`-A`)
- `perf(paint):` Track A (styles.css, critical.css, aurora.js, loader.js, index.html beam classes, min mirrors).
- `perf(boot):` B1 boot parallelize (boot.js + min).
- `perf(icons):` B2 prebake (scripts/prebake-icons.js, build.sh, index.html, min mirrors, version stamps).
- `perf(render):` B3 content-visibility (styles.css/critical.css + min).
- `feat(motion):` Phase 2 animations — separate commit per pattern (tooltip / form / accordion / hero-stack).
- `docs:` `docs/aidlc/45-*.md`.
