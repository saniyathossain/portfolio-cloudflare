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

Phase 1 was committed separately by the user (`b49ec08`). Phase 2 executed in this pass:

## Phase 2 execution status

| # | Item | Outcome |
|---|---|---|
| C1 | Tooltip spring + clip-path reveal — all 3 variants (`.brand-tooltip`, `.popover__panel`, `.partner-orb__tip`) | **Done** — each now wipes via `clip-path: inset()` growing from its arrow-edge origin in lockstep with the existing scale/translate spring; unified onto `var(--ease-spring)` (popover was previously plain `ease`, no clip-path). Cheap to animate at tooltip size (unlike backdrop-filter on large surfaces). |
| C2 | Form focus spring + caret (contact modal) | **Scoped down, done** — the literal skiper106 spring-caret overlay needs canvas text-measurement + exact font-metric replication (padding/letter-spacing/ResizeObserver); a misaligned custom caret would be a worse UX than the native one, so recreated the *premium spring feel* instead: animated underline that draws in on focus (`scaleX` from center), a subtle field lift + glow ring, and a proper slide+fade `x-transition` on the error message (previously a hard `x-show` pop with zero transition). |
| C3 | Accordion bouncy overshoot spring | **Done** — `_animateHeight()` in app.js now accepts a per-call easing; **open** uses a back-out cubic-bezier (`0.34, 1.56, 0.64, 1`, y>1 = genuine px overshoot past `scrollHeight` before settling), **close** stays on the original flat decel curve (a bounce right before fully collapsing would read as a glitch, not a spring). |
| D1 | Hero cards stagger-in stack reveal | **Done** — new `[data-reveal="stack"]` CSS variant on `.hero-card`: 3D tilt+lift+scale entrance using `.hero__aside`'s previously-unused `perspective: 1000px` (vestigial scaffolding, like the hero h1's `line-wrap` split). Added a second-stage cascade: `.hero-card__badge` pops in a beat after the card settles via a `backwards`-fill (not `both`/`forwards`) keyframe animation — `backwards` was required specifically to avoid permanently blocking the badge's existing `:hover`/`:focus-within` drawer-flip transform after the one-shot entrance completes. |
| E1 | Broader hover smoothness pass | **Done, scoped** — `.service-row__icon` hover tightened 0.5s→0.28s (design-taste guidance: UI hover should stay under ~300ms) and switched from flat `--ease-glass` to `--ease-tile` (built for exactly this — small tile/icon lift). `.icon-chip` (used across service rows, skills panels, stat panels) previously had **no transform at all** on hover, only a box-shadow deepen — added the same lift language so hovering any icon chip site-wide now has real kinetic response. Confirmed composes cleanly with the pre-existing `.service-row__arrow` wrapper transform (different DOM nodes, not a conflict). Not a full sweep of every hover/transition in the stylesheet — scoped to the two components with the widest reuse for the best effort/impact ratio. |

**Verification performed:** `bash build.sh` clean, `preflight-check.js` OK, diff scope matches exactly. Live headless-Chrome CDP trace of every new interaction: hero card `is-visible` + badge animation correctly queued; accordion opens/settles/cleans-up inline styles with no JS errors; brand-tooltip rest-state `clip-path` matches spec exactly; modal opens via `Alpine.$data()`; form-error transition traced through its full class lifecycle (`enter-start`→`enter`+`enter-end`→cleanup, opacity 0→0.51→1, classes removed on completion) confirming the spring transition genuinely animates rather than snapping. One item **not** independently visually confirmed: `:focus-within` field-underline draw-in — headless Chrome's synthetic `.focus()` didn't move `document.activeElement` in this harness (a known headless window-focus limitation, not a code issue); the CSS itself is a plain, well-supported `:focus-within` selector, low risk. **Not committed** — awaiting explicit permission, per standing instruction.

Real desktop PSI re-measurement (both phases) is blocked on the PSI API quota exhaustion noted in the Context above — verify post-deploy.

## Phase 2 follow-up: tooltip callout arrows + shine, broader icon animation

| # | Item | Outcome |
|---|---|---|
| — | **Bug fix (found while implementing this round):** C1's `clip-path` reveal used a visible-state inset of exactly `0` on all 3 tooltip variants. `clip-path`'s default reference box is the border-box, so an inset of `0` clips away anything painted *outside* that box — including each tooltip's arrow pseudo-element (positioned via `top:100%`/`bottom:100%`, straddling the panel edge). The arrows were silently invisible even in the "revealed" state since C1 shipped. Fixed by giving the visible-state inset a negative value on the arrow's edge (`-0.6rem`) on all 3 — verified live via real CDP mouse-hover that `clip-path` now computes with the negative inset and `opacity:1`. | **Fixed** |
| — | Tooltip callout arrows — all 3 variants | **Done** — replaced the flat CSS-border-triangle hack with a rotated 0.6rem square straddling the panel edge (same fill color, small offset shadow, `border-radius` for a softer corner), a more premium "speech bubble" read with real depth instead of a razor-flat wedge. `z-index:-1` keeps it below in-flow panel content but above the panel's own background (correct CSS stacking order for negative-z descendants). |
| — | Tooltip text shine — all 3 variants | **Done** — `.tooltip-shine` (shared class): `background-clip:text` gradient sweep, reusing the header logo's `bismSheen`/`bismSweep` visual language for consistency. Two color variants: warm-gold-on-white for the dark-bg brand-tooltip, copper-accent-on-ink for the light-bg popover/partner-orb (ties into the site's one locked accent instead of a generic glint). `color` fallback set first for browsers without `background-clip:text`. Required wrapping brand-tooltip's raw text node and moving partner-orb-tip's `x-text` to an inner span (both in `index.html`); the 3 popover sites already had a `.popover__label` text wrapper, so just added the class. |
| — | Icon animations — universal base + accordion chevron bounce | **Done, scoped** — added a universal `.ui-icon { transition: transform 0.24s var(--ease-spring) }` base so any icon-level transform change animates by default instead of snapping (existing more-specific per-component transitions simply override it via normal cascade). Accordion chevron (`.exp-row__chev`) now uses the same asymmetric-easing trick as the accordion height itself: `.is-open` declares its own overshoot `cubic-bezier(0.34, 1.56, 0.64, 1)` transition (rotation genuinely overshoots past 180deg then settles — CSS transitions read the *target* state's transition declaration), while closing falls back to the base rule's flat curve automatically. The hamburger→X menu icon already had a spring morph (`--ease-liquid`) from before this session — left untouched. |

**Verification performed:** `bash build.sh` clean, `preflight-check.js` OK. Live CDP with **real synthetic mouse hover** (`Input.dispatchMouseEvent`, not just class-toggling) on `.brand-tooltip` and `.partner-orb__tip`: confirmed `opacity:1`, `clip-path` computes with the negative inset (bug fix verified working), arrow `::before`/`::after` renders with correct `rotate(45deg)` matrix, correct background color, correct size; `.tooltip-shine` confirmed active (`-webkit-text-fill-color: rgba(0,0,0,0)`, gradient present). Accordion chevron mid-transition confirmed `transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1)` applied on open. Not committed — awaiting explicit permission.

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
