# Plan 42 — Button redesign + animation robustness + scroll-smoothness + gitignore

## Context

The user dislikes the current button design and wants a **more aesthetic button system** (desktop + mobile), **more robust transitions/hover/animations**, a fix for scrolling that **"sometimes feels stuck,"** and a sweep for **animation conflicts/overlaps/severe bugs**. Plus a **gitignore recheck**.

A deep audit (3 Explore agents over the CSS/JS + the installed design-taste skills + `docs/aidlc/`) established the concrete problems and the guardrails. Two design decisions were taken with the user this session:
1. **Primary CTA material → copper-tinted glass** (brand-forward, within the locked shiny-chip language).
2. **Lighten the desktop header blur** for scroll smoothness.

**Baseline:** branch `rc/v1.1`, HEAD `b23b1ed`, **5 commits ahead of origin** (plan-41 work committed but unpushed/undeployed). Working tree clean except untracked `.impeccable/`. This work stacks on top; deployment stays blocked on Cloudflare auth (out of scope here — a single deploy later ships everything).

**Hard constraints (CLAUDE.md + `.cursor/skills/portfolio/SKILL.md` + aidlc):**
- Shiny-chip / liquid-glass language is **locked** — never fall back to neutral backdrop-filter-only "glass" (user rejected). Tinted gradient fill + inset highlight + soft `--tint` shadow + diagonal `::before` gloss.
- **No smooth-scroll JS library** (Lenis was removed — it *was* the culprit; native scroll only).
- **Never animate `filter: blur()`** (not compositor-accelerated in WebKit).
- Every animation **`prefers-reduced-motion`-gated**; GPU-only (`transform`/`opacity`) for anything on the scroll/hover hot path.
- **PageSpeed 100** both form factors; light-only; no new network requests; no inline `style=""`; `<head>` via `scripts/sync-head.js` only.
- Commits on `rc/v1.1`, **staged by name** (never `git add -A`); do **not** stage `.impeccable/`.

---

## Audit findings — the "conflicts / overlaps / severe bugs" answer

**Real bugs (2):**
- **Dead parallax** — `index.html` `.hero-partners` has `data-parallax="0.05"` but the reveal system's `transform` wins specificity in both states, so parallax **never applies**; yet `motion.js` still calls `getBoundingClientRect()` on it **every scroll frame** (wasted forced layout). → fix in Step 6.
- **Hero-card entrance snaps** — on desktop ≥1024px the `.hero__aside .hero-card[data-reveal]` rule (specificity winner) has a `transition` list that omits `opacity`/`transform`, so the card's entrance reveal jumps instead of easing. → fix in Step 6.

**Not bugs (verified healthy):** create-band tiles are touched by 6 systems but their `transform` is correctly composed via `var(--parallax-y)` (no clobber); `pillFlip` (fine-pointer) vs `pillTap` (touch) are mutually exclusive; **no `transition: all` anywhere**; reduced-motion gating is comprehensive (global catch-all + per-module early-returns).

**Perf/robustness (cause the "stuck" feel, not logic bugs):** fixed-header `backdrop-filter` re-blur every frame + animated blur radius; 7 always-repainting conic `beam-rotate` borders; aurora canvas re-arming rAF at 60fps to draw at 24fps. → Steps 4, 5, 7.

**Skill grounding for the redesign:** press = `scale(0.96–0.98)` at **100–160ms ease-out**; UI hover **< 300ms** (current is 450ms); never `scale(0)`, never `ease-in`, GPU-only; nested arrow coin should translate + scale on hover ("internal kinetic tension"); `:focus-visible` mirrors `:hover`; ≥44px tap targets; `touch-action: manipulation`; WCAG AA button contrast.

---

## Step 1 — Shared control-token system (`styles.css` `:root`)
No shared button sizing exists today — every button hard-codes padding/height/font. Add tokens next to the existing easing/duration block (`styles.css:105–130`):
- `--control-pad-x`, `--control-pad-y`, `--control-gap`, `--btn-icon-size`, `--btn-radius: var(--radius-pill)`.
- `--dur-btn-hover: 0.22s`, `--dur-btn-press: 0.13s`, `--ease-btn: var(--ease-hover)` (snappy; ~cubic-bezier(0.25,0.9,0.35,1)). Replaces the sluggish 0.45s hover.
Buttons live in `styles.css` (async-loaded), so tokens go here, not in `critical.css`.

## Step 2 — Primary + secondary CTA (copper-tinted glass)
Restyle **in place** (keep class names `.pill-btn-dark` / `.pill-btn-glass` to avoid churn across ~5 HTML sites + sync-head; add comments noting `-dark` is now the copper primary). `styles.css:1458–1498`:
- **`.pill-btn-dark` → copper primary:** deep copper gradient (e.g. `linear-gradient(145deg, var(--accent-bright) → var(--accent-dark))` tuned dark enough that **white text passes AA ≥4.5:1** against the lightest stop — verify), white arrow coin, copper `.beam`, `::after` gloss retained. Applies everywhere `.pill-btn-dark` is used (hero primary, modal submit, under-construction CTA, success close) → one consistent brand action.
- **`.pill-btn-glass` (secondary):** keep frosted-white but refine highlight/rim; dark arrow coin (inverted pair preserved).
- **Kinetic arrow coin:** `.pill-btn-dark:hover .pill-btn__icon`, `.pill-btn-glass:hover .pill-btn__icon { transform: translateX(3px) scale(1.06) }` on a `--dur-btn-hover` transition (coin is static today).
- **Timing + press:** hover transitions 0.45s → `--dur-btn-hover`; press `scale(0.985)` → `scale(0.97)` at `--dur-btn-press`; add `touch-action: manipulation`. Mirror hover state on `:focus-visible`.

## Step 3 — Bring the flat buttons into the family
- **`.pill-btn-outline`** (About "My work") — currently Tailwind-only, no states. Add an override in `styles.css` (loads after `tailwind.css`, wins): tinted glass fill + 1px `--tint` rim + hover lift + kinetic arrow coin + press + `:focus-visible`. Wrap its bare arrow in `.pill-btn__icon` in `index.html`.
- **Footer "Get in touch"** (`index.html`, currently `bg-surface text-ink py-3.5 px-7`) — swap to the copper `.pill-btn-dark` treatment (consistent primary action; copper reads well on the dark footer) and wrap its arrow in `.pill-btn__icon`.

## Step 4 — Header glass: scroll smoothness (edit BOTH `critical.css` + `styles.css`)
`.glass-pill` is mirrored in `critical.css` (inline `<head>`) and `styles.css:892–936` — change both to keep the containment check happy.
- **Drop `backdrop-filter` from the transition list** (`styles.css:906–907` + `critical.css` twin) → transition only `background` + `box-shadow`. Kills the expensive animated blur-radius on the scroll-cross.
- **Lower desktop blur:** base `blur(28px) → blur(20px)`; `.is-scrolled` `blur(34px) → blur(20px)` (keep only bg/shadow deepening on scroll, one steady blur radius). Still clearly glass; matches the mobile coarse-pointer cap. Biggest single scroll-smoothness win.

## Step 5 — Pause decorative infinite animations off-screen (`motion.js`/`reveal.js` + CSS)
7 conic `beam-rotate` borders + 4 `create-band-pulse`/`float` keep painting whenever the tab is focused, regardless of scroll position (they only pause on `is-idle`). Add a small **IntersectionObserver** that toggles `.is-paused` on `.beam` elements + the create-band section; CSS: `.beam.is-paused::before, .is-paused .create-band__tile { animation-play-state: paused }`. ~12 lines, preserves the look, stops mid-scroll paint. (Reuse `motion.js`'s existing `heroInView` observer for the hero beams; one shared IO for the rest.)

## Step 6 — Fix the two real bugs
- **Dead parallax:** remove `data-parallax="0.05"` from `.hero-partners` in `index.html` (effect never applied; removal also drops it from `motion.js`'s per-frame `getBoundingClientRect` loop).
- **Hero-card entrance snap:** add `opacity` + `transform` (with `--dur-reveal`/`--ease-reveal`) to the `transition` list of `.hero__aside .hero-card[data-reveal]` (`styles.css:1746–1749`), keeping `clip-path`/`padding-right`/`box-shadow`. Verify the desktop hover clip-path drawer still animates.

## Step 7 — Aurora rAF throttle (minor robustness, `aurora.js`)
Loop re-arms `requestAnimationFrame` every frame even when the `FRAME_MS` gate skips the draw (wakes the main thread at 60fps to paint at 24). Re-arm only when actually drawing (or gate the re-arm behind the frame timer). Desktop-only + reduced-motion-gated already.

## Step 8 — gitignore recheck (`.gitignore`)
Add per-machine impeccable state so fresh clones ignore it (currently only in local `.git/info/exclude`, and `.impeccable/` shows untracked):
```
.impeccable/hook.cache.json
.impeccable/hook.pending.json
.impeccable/config.json
```
Keeps the working tree clean and respects the standing "don't stage `.impeccable/`" rule. **Trade-off:** `config.json` holds impeccable detector exceptions (Inter font, spring easing); ignoring it means those don't travel to fresh clones running the committed hook — low impact for a personal portfolio. If preferred, commit `config.json` instead so the exceptions travel. Default: **ignore** it.

## Step 9 — Build + self-check
`bash build.sh`. Confirm: `critical.min.css` regenerated + inlined; `ASSET_V` restamped (`boot.js`/head/`EARLY_HINTS`); `sw.js` rehashed; only the 2 expected containment warnings; `git diff index.html` shows only `<!-- SYNC -->` blocks + inline loader preset + the intended footer/outline markup edits; brace balance intact. Verify: **white-text AA contrast on the copper primary**; buttons don't shift layout (**CLS stays 0**); reduced-motion pass; touch-emulation press feedback.

## Step 10 — Commit on `rc/v1.1`, staged by name
Group (stage explicitly; never `-A`; don't stage `.impeccable/`):
- `docs:` new `docs/aidlc/42-*.md` (copy of this plan).
- `feat(buttons):` copper primary + control tokens + kinetic arrow + outline/footer into glass → `styles.css`, `index.html`, `styles.min.css`, `src/index.js`(ASSET_V), `sw.js`, `boot.js`(hash).
- `perf(scroll):` header blur/transition + off-screen pause + dead-parallax + hero-card entrance + aurora rAF → `styles.css`, `critical.css`, `critical.min.css`, `index.html`, `motion.js`/`motion.min.js`, `aurora.js`/`aurora.min.js`, `reveal.js` (if touched), `styles.min.css`, `sw.js`.
- `chore:` `.gitignore`.
Keep built/minified artifacts in the same commit as their source.

## Verification
- **Local (CDP mobile + desktop emulation):** screenshot all button states (rest/hover/press/focus) at 360/768/1024/1440; scroll-jank check (paint-flashing / dropped frames) before vs after; reduced-motion pass; copper-primary contrast sampled from rendered pixels.
- **Real acceptance (post-deploy, once Cloudflare auth available):** PSI both form factors on the deployed site in incognito must stay 100/100; on-device scroll-smoothness + button feel pass.

## Critical files
`public/assets/css/styles.css` · `public/assets/css/critical.css` · `public/index.html` · `public/assets/js/motion.js` · `public/assets/js/aurora.js` · `public/assets/js/reveal.js` (only if the shared IO lands here) · `.gitignore` · built mirrors (`*.min.css`, `*.min.js`) · `src/index.js` + `public/sw.js` (auto-restamped) · `docs/aidlc/42-*.md`.
