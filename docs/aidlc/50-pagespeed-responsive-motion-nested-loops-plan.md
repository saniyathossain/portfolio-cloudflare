# 50 — PageSpeed both ends, better responsive design, no-nested-loops convention, dashing motion polish

## Context

Picking up where the last session left off. Two workstreams from the prior plan were never executed: **W9 (PageSpeed audit — never reached 100)** and **W10 (dead-code cleanup — never started)**. The owner now also wants: (1) a new AIDLC coding convention — avoid nested loops, prefer early returns/flattening — documented and applied; (2) PageSpeed pushed further on **both** mobile and desktop; (3) **better responsive design**, not just regression-proofing the existing layout; (4) the site's animations elevated to feel as polished as a Framer-Motion/GSAP-built site ("dashing"), **without** literally adding those libraries and **without** regressing PageSpeed or hurting UX. This plan is saved to `docs/aidlc/50-pagespeed-responsive-motion-nested-loops-plan.md` as the design-history record, and execution fans out multiple subagents (Explore for research, general-purpose for implementation chunks) and pulls in the installed design skills (`design-taste-frontend`, `high-end-visual-design`, `emil-design-eng`, `animation-vocabulary`) where taste judgment is needed, rather than one agent doing everything serially.

I re-measured **live production** (`https://saniyat.com`, real Lighthouse CLI hitting the actual Cloudflare Worker, not a stale/local number) to ground this plan in current reality:

| | Mobile | Desktop |
|---|---|---|
| Performance | **69** | **92** |
| Accessibility | 95 | 97 |
| Best Practices | 100 | 100 |
| SEO | 92 | 92 |
| Total Blocking Time | 2,940ms | 180ms |
| DOM size | 1,804 elements | same |

**Root cause of mobile Performance 69 (confirmed via mainthread-work-breakdown, not guessed):** Style & Layout 2,218ms + `alpine.min.js` scripting 1,387ms — Alpine's init walk over the DOM is still the dominant cost (already cut from 2,503→1,804 elements by prior work, but not enough). **`SEO 92` on both form factors is NOT fixable via code** — `curl https://saniyat.com/robots.txt` confirms Cloudflare's managed "AI Crawl Control" is still injecting a `Content-Signal` block ahead of the repo's clean `public/robots.txt`, exactly as flagged in an earlier session. This requires the owner to disable it at the Cloudflare dashboard (Websites → saniyat.com → AI Crawl Control) — I cannot do this from the repo. Everything else below is achievable in code.

Three parallel research agents plus my own live-site checks grounded the rest of this plan (findings below drive the file/line targets — do not re-research these):
1. **Nested-loop audit** — genuinely only **one** real site in the whole codebase: `blur-reveal.js` `splitWords()` lines 52–60 (phrase-highlight matching, a real O(words×phrase) double-`for`). Everything else that looked nested on first read (motion.js's `pillFlip()`/`setupPillRowReflow()`, reveal.js's `initLateMountWatcher()`) is either two independent passes over the same array (idiomatic, not a cross-product) or inherently O(mutations×addedNodes) and correctly structured — leave those alone.
2. **Animation audit** — the site already has substantial premium motion (docs 21/42/45 already shipped spring-overshoot accordions, tooltip clip-reveals, kinetic buttons). Real remaining gaps are on **flat/no-overshoot spots**: hero card entrance, scroll reveals, education-card hover, service-row hover, back-to-top, count-up stats, editorial row tilt (currently un-damped/twitchy), scroll parallax (currently instant, no spring float). The site's own `--ease-spring`/`--ease-liquid`/`--ease-glass` tokens (styles.css ~109–148) already give y>1 overshoot vocabulary to reuse — no new easing values needed.
3. **Dead-code audit** — codebase is already lean (confirmed grep-verified). Only **5 orphaned PNG logo fallbacks** (WebP already used everywhere) found as genuinely dead; no dead JS functions, no dead CSS selectors, no orphaned scripts. The `shots/` directory referenced in an earlier session's notes does **not exist** on `develop`/`main` (was only ever on the abandoned `rc/v1.1` branch) — nothing to clean up there.
4. **My own follow-up checks** found: (a) `.nav-overlay`/`.modal-backdrop` are always mounted (CSS-only hidden, no `x-if` gate) — same lazy-mount opportunity already proven for the experience accordion, never applied here; (b) live **desktop** Lighthouse has its own distinct, confirmed findings (forced reflow, a real WCAG color-contrast failure, an oversized hero image srcset pick) — see T2; (c) a fresh responsive screenshot sweep of **live production** at 320/360/768/1024/1440 found the layout structurally sound (zero JS errors, no confirmed hard overlaps after precise bounding-box measurement) but the 768px tablet band (hero text column vs. hero card) reads visually tight — worth a real polish pass, not a false "it's broken" claim.

## Branch

Continue on **`rc/v1.2`** if it still exists locally with a clean/expected state, otherwise cut a fresh branch from `develop` (confirm at execution start — `develop`/`main` are currently identical). Commit staged by name, never `git add -A`. Do not merge/push/deploy without explicit instruction (the owner has been deploying independently — that's fine, just don't do it myself unless asked).

---

## T1 — AIDLC convention: no nested loops / early returns

Update `docs/aidlc/48-code-conventions-template-literals-early-returns.md`, adding a "Rule 3" section: **avoid nested loops over different collections — extract the inner loop into a named helper function, or use `Array.some()`/`.find()`/early-`continue`, rather than inlining a second loop inside the first.** Document the exception already established in this codebase: two *independent sequential passes* over the *same* array (not a cross-product) are fine and don't need flattening — cite `motion.js`'s `pillFlip()` as the canonical example of acceptable "looks nested, isn't" code so future edits don't over-flatten.

**Apply it:** refactor `blur-reveal.js` `splitWords()` (lines 52–60) — extract the phrase-vs-word-window matching into a small named helper (e.g. `matchesPhraseAt(words, i, phrase)`) called from a single loop, replacing the nested `for(i)/for(j)` pair. Behavior-preserving only — verify via `node --check` and a visual check that keyword highlighting (About heading, section headings) still renders identically.

---

## T2 — PageSpeed: close the gap on BOTH mobile and desktop

Live desktop Lighthouse surfaced concrete findings distinct from the mobile TBT story:

| Desktop audit | Score | Finding |
|---|---|---|
| `forced-reflow-insight` | 0 | **Confirmed layout-thrashing bug** — `reveal.min.js` (top contributor, ~42ms), plus smaller amounts in `app.min.js`/`editorial.min.js`. A style write is followed by a synchronous layout read (`.offsetWidth`/`getBoundingClientRect()`) without yielding a frame somewhere in these three files — map back to unminified source and fix (batch reads before writes, or defer the read a frame). |
| `color-contrast` (Accessibility) | 0 (FAIL) | **Confirmed WCAG failure** — `.sec-sub span` (small icon-adjacent section-subtitle text) on **both `#services` and `#skills`**: foreground `#6f5c4f` on background `#d7d6d4` = 4.35:1, needs 4.5:1. Darken the foreground slightly until it clears 4.5:1 — surgical color-token change, not a redesign. |
| `uses-responsive-images` | 0 | **Confirmed oversized image** — hero's `#heroBaseImg` serves the `-900.webp` srcset candidate at a ~785px display width, wasting **56% (61KB of 108KB)**; the `imagesizes` attribute on the hero `<picture>`/`<img>` is miscalibrated — recalibrate `sizes` so the browser picks the right `-480/-900/-1300/-1800` candidate. A `sizes`-attribute fix, not a visual change — compatible with the hero being otherwise frozen. |
| `unminified-css` | 0.5 | ~3KiB extra achievable — check whether `minify-css.js`'s output is missing an optimization or if this is inline critical-CSS noise; quick check, low priority. |
| `unused-css-rules` | 0 | 18KiB flagged — **Lighthouse's initial-paint coverage signal, NOT dead code** (T5 cleanup already grep-verified no truly dead CSS — hover-only/modal/nav-overlay states just aren't exercised on first paint by design). Do not delete anything based on this audit alone. |
| `dom-size` | 0 | Same 1,804-element count as mobile — addressed by the nav/modal lazy-mount below, shared fix for both form factors. |

**Actions:**
1. **Lazy-mount the nav overlay and contact modal** (both form factors) — mirror the pattern already proven for `hasOpenedOnce(role.id)` in `app.js`'s `toggleRole()`: add `openedMenuOnce`/`openedModalOnce` state, wrap the nav-overlay's `<ul>` list (index.html ~840–850) and the modal's form body (index.html ~859+) in `<template x-if="...">`, set the flag in `openMenu()`/`navGo()`'s modal branch/`openModal()` (app.js), sequence with `$nextTick()` before anything measures height/position. Removes ~24 nav-item elements + the full contact-form subtree from Alpine's initial walk with **zero visual change**.
2. **Fix the forced reflow** — trace `reveal.min.js`'s contributor back to unminified source (likely `initReveals()`/`initStagger()`/`applyAdaptiveGrid()`/the scroll-progress writer) and restructure so layout reads happen before writes, or defer the read a frame. Verify by re-running `forced-reflow-insight` before/after — measurable, not code-review-confidence.
3. **Fix the color-contrast failure** — darken `.sec-sub span`'s color token until it passes 4.5:1 on both `#services` and `#skills`; re-run `color-contrast` to confirm.
4. **Recalibrate the hero image `sizes` attribute**; re-check `uses-responsive-images` savings after.
5. **Re-profile mobile** after (1) with local + live Lighthouse; if Alpine's init cost is still dominant, do one more targeted pass identifying the next-largest always-mounted-but-often-unseen subtree (profile, don't guess).
6. **Do not** attempt to fix SEO 92 in code (dashboard-only) — note as a handoff item, not a code task.
7. Confirm neither form factor regresses from T3's motion changes or T4's responsive changes — re-run both live Lighthouse presets at the end and diff against this table.

---

## T3 — Animation polish: elevate to "dashing" within the existing token vocabulary, zero mobile-cost

**Hard rule carried over and re-confirmed: no Motion One / Framer Motion / GSAP runtime dependency.** "Framer/GSAP-like" means matching that *quality of motion* (spring overshoot, damped follow, choreographed timing) using the site's own hand-rolled rAF-spring architecture (`motion.js`'s `makeSpring()`) and CSS custom-property-driven transforms (never raw `el.style.transform` on an element that also has a CSS transition). Every change must be desktop-gated (`(hover:hover) and (pointer:fine)`) wherever it adds JS cost, or be a **pure CSS token/duration change with zero DOM/JS footprint**. Use the `animation-vocabulary` skill to name techniques precisely when documenting these, and `emil-design-eng`/`high-end-visual-design` for the taste judgment on exactly how much overshoot reads as "premium" vs. "bouncy/cheap."

**Tier 1 — pure CSS, zero JS, zero mobile-cost risk:**
- Scroll reveals (`--ease-reveal`/`--dur-reveal`, styles.css ~109/128): tighten toward `--ease-spring`-style overshoot — affects ~20 elements site-wide, biggest lift-per-change.
- Education-card hover (styles.css ~462–471): split the `transform` transition onto a spring curve while shadow/border stay on `--ease-glass` decel.
- Service-row icon hover (styles.css ~3712 area): same split-transition treatment.
- Back-to-top button (styles.css ~5000–5021): swap its transform transition to `--ease-spring`.

**Tier 2 — desktop-gated rAF-spring wrapper:**
- Editorial row tilt (`editorial.js` `editorialBindRowTilt()`, ~50–78): currently writes `--tilt-x/--tilt-y` directly per pointermove (instant, twitchy) — route through a small spring settle (same shape as `motion.js`'s `tilt()`) so it damps toward the pointer.
- Scroll parallax (`motion.js` `applyParallax()`/`applyElementParallax()`, ~130–172): currently a direct `scrollY * speed` mapping — add a lightweight spring float (adapt `heroSpatial()`'s settle pattern). Keep it inside the already-coalesced scroll rAF path, don't add a second listener.

**Tier 3 — touch-safe, works everywhere:**
- Count-up stats easing (`reveal.js` count-up, `editorial.js`'s `editorialAnimateCount`): both plain easeOutCubic today — add a subtle overshoot in the final ~10% so numbers land with a small bounce.

**Explicitly do not touch** (already "dashing" — don't regress what's good): hero liquid-cursor parallax, pill FLIP reveal/glide, blur-reveal text cascade, accordion open/close overshoot, tooltip clip-reveal, button hover/press kinetics, menu ripple bloom, editorial title cascade, pill entrance stagger.

---

## T4 — Better responsive design

Fresh live-production screenshot sweep (320/360/768/1024/1440, zero JS errors at every width) confirms the layout is structurally sound — no confirmed hard breakages — so this is a **polish pass**, not a bug hunt, plus the one concrete cross-cutting item (uses-responsive-images) already covered in T2:

1. **768px tablet band ("md", `768px–1023px`) hero spacing** — precise bounding-box measurement shows the hero text column and hero card do **not** technically overlap (22–51px gaps), but the visual read at this exact width is tight/cramped between `.hero__copy`/`.hero__actions` and `.hero-card`. Since the hero is otherwise frozen (no redesign), this is scoped narrowly: adjust only the `768px–1023px` grid gap/column ratio in the existing `@media (min-width: 768px) and (max-width: 1023px) { .hero__grid { ... } }` rule (styles.css) to open a bit more breathing room — a spacing tune, not a redesign, and must be verified with a real screenshot before/after (don't just trust the numbers this time, given the last check already showed the visual read can diverge from box math).
2. **Re-verify the "awkward middle" breakpoints specifically** (768–1023, the least-tested band historically) across `#skills`, `#editorial`, `#experience`, `#education` — not just the already-solid 360/1024/1440 checkpoints — since that's precisely where a two-column/one-column layout transition is most likely to feel unbalanced even without breaking. Use the `design-taste-frontend` skill's eye for spacing/rhythm here, not just "does it overflow."
3. Fold in the T2 hero-image `sizes` recalibration verification here too (same file area, same testing pass).
4. Any additional concrete breakage found during the fresh sweep (fan out an agent to re-screenshot after T1–T3 land, since those change spacing/timing in shared sections) gets fixed as found — don't pre-guess further issues not yet confirmed.

---

## T5 — Cleanup (finishing W10)

Delete the 5 confirmed-dead PNG logo fallbacks (WebP equivalents already used everywhere, zero references verified by grep): `public/assets/img/logos/east-west-university.png`, `icddrb-official.png`, `motijheel-school.png`, `oss-official-transparent.png`, `st-joseph.png`. Re-verify zero references once more immediately before deleting (in case T1–T4 edits touched anything nearby). No dead JS/CSS/scripts to remove — the earlier plan's `shots/` cleanup target doesn't exist on this branch.

---

## Verification (fan out agents where independent; test thoroughly with real screenshots, not assumptions)

1. **Build + syntax:** `node --check` every edited JS file; run the narrower build chain (`minify-css.js` → `set-asset-version.js` → `minify-js.js` → `sync-head.js` → `hash-sw.js`) after every CSS/JS edit — do not skip.
2. **T1 (nested loops):** visual check that About-heading and section-heading keyword highlighting still renders correctly after the `blur-reveal.js` refactor (screenshot before/after).
3. **T2 (perf):** Playwright interaction test confirming the nav overlay and contact modal still open/animate/first-open-height correctly after lazy-mounting; local Lighthouse mobile+desktop before/after; re-run the specific `forced-reflow-insight`/`color-contrast`/`uses-responsive-images` audits to confirm each fix measurably lands; a final live Lighthouse run against `https://saniyat.com` once the owner deploys, diffed against this plan's baseline table.
4. **T3 (motion):** real Playwright screenshots/hover-drives for every touched selector — scroll-reveal timing, education-card hover, service-row hover, back-to-top, editorial row tilt damping, parallax float, count-up bounce — at minimum in Chromium; confirm `prefers-reduced-motion: reduce` emulation disables every new spring (test this explicitly — skipped last session). Confirm mobile emulation shows zero behavior change on Tier-2 items.
5. **T4 (responsive):** screenshot sweep at 320/360/390/768/834/1024/1280/1440 on every touched section, before/after; Firefox spot-check across the same widths (last session only spot-checked one width); note Safari/WebKit still can't launch in this sandbox — flag for the owner's manual post-deploy check.
6. **T5 (cleanup):** confirm build succeeds and visual smoke test shows no broken images after PNG deletion.
7. **Whole-plan regression guard:** re-run both live Lighthouse presets at the end (once deployed) and diff every category against this plan's baseline table — call out explicitly which numbers moved and by how much, don't just declare success.

## Non-goals

No Motion One/Framer Motion/GSAP runtime dependency. No SEO-92 code fix (dashboard-only, hand off). No hero redesign — only the narrow `768–1023` spacing tune and the `sizes`-attribute fix, both non-visual-identity changes. No animation the audit already marked "dashing." No commits/pushes/deploys without explicit instruction. No re-litigating the About-copy revert from last session unless asked.

## Critical files

- `docs/aidlc/48-code-conventions-template-literals-early-returns.md` — add nested-loop rule (T1)
- `docs/aidlc/50-pagespeed-responsive-motion-nested-loops-plan.md` — **new**, this plan as design-history record
- `public/assets/js/blur-reveal.js` — T1 flatten `splitWords()`; exports `window.blurReveal` used by editorial cascade (T3 doesn't touch this export)
- `public/index.html` — T2 nav-overlay (~830–850) + modal (~859+) lazy-mount `x-if` gates
- `public/assets/js/app.js` — T2 `openMenu()`/`navGo()`/`openModal()` state + `$nextTick()` sequencing; also likely forced-reflow contributor
- `public/assets/js/reveal.js` — T2 forced-reflow fix (primary contributor), T3 Tier-3 count-up easing
- `public/assets/js/editorial.js` — T2 forced-reflow (minor contributor), T3 Tier-2 row-tilt spring damping + Tier-3 count-up easing
- `public/assets/css/styles.css` — T2 `.sec-sub span` contrast fix; T3 Tier-1 token/selector tweaks; T4 `768–1023` hero grid spacing tune
- `public/index.html` — T2 hero image `sizes` attribute recalibration
- `public/assets/js/motion.js` — T3 Tier-2 parallax spring float (reuse `makeSpring()`)
- `public/assets/img/logos/*.png` (5 files) — T5 deletion
- Build: `scripts/minify-css.js`, `set-asset-version.js`, `minify-js.js`, `sync-head.js`, `hash-sw.js`
