# AIDLC 18 — Signature Uplift: Whisper Aurora + Sun-Glare, Faux-Frost, Awe-Motion, PageSpeed 100

**Goal:** lift the site to a genuinely stunning, modern, unmistakably *macOS Tahoe* feel — deep polish on every detail plus 2–3 signature "awe" moments — **without** losing PageSpeed 100 (mobile + web), the established theme, or the shiny-chip/liquid-glass language.

Supersedes the exploratory bold-restructure ambitions in docs 16–17 (reverted in 2b for stability): this plan is **balanced-bold within the current structure**, not a teardown.

## Decisions (locked with the user)

- **Ambition:** Balanced bold — polish across all sections + 2–3 signature moments, current DOM structure kept.
- **Aurora / glare:** Whisper-subtle — calm cool field (azure/cyan/violet/teal), **red/pink pulled right back**, plus one faint warm **sun-glare bloom** as the single warm focal accent.
- **Performance:** PageSpeed **100 mobile + web** is a hard gate. Every change must be perf-safe *by construction*.
- **Theme:** Tahoe liquid-glass + shiny tinted chips + copper/azure palette preserved. No gradient-text tells, no glassmorphism-as-default drift.

## Non-negotiable guardrails (PS100 by construction)

1. **No new network requests.** No CDNs, no new fonts/images/JS. Aurora/sun-glare are CSS/canvas only.
2. **All visual work lives in `styles.css`** (hand-written design system). **No new Tailwind utility classes in HTML** → no `tailwind.css` rebuild (the standalone CLI in `build-css.sh` is macOS-only, would fail on Linux).
3. **Animate only `transform` / `opacity` / `background-position` / `filter` on a few elements.** No layout-property animation (this plan *fixes* the one offender — the brand-pill `grid-template-columns` reveal).
4. **Faux-frost everywhere that scrolls.** Real `backdrop-filter` stays only on *fixed/sticky* chrome (header, nav, modal, loader, clock). Convert the 3 remaining scrolling-surface leaks.
5. **`prefers-reduced-motion`** disables every animation (content fully visible); **`@media (hover:hover) and (pointer:fine)`** gates hovers; heavy effects (canvas aurora, parallax, liquid) stay **desktop/fine-pointer only** — mobile never loads them (mobile 100 untouched).
6. **Responsive verified** at 360 / 768 / 1024 / 1440; `100dvh` not `vh`.
7. **Env caveat:** Lighthouse/Wrangler can't run in this Linux dev env (build is macOS-only). Changes are perf-safe by construction; user verifies the 100 score post-deploy.

---

## Workstream 1 — Perf & correctness fixes (audit items #1, #3)

- **1a. Early-Hint CSS URL mismatch.** `src/index.js:14` preloads `</assets/css/styles.css>` but `index.html:34` loads `styles.css?v=scroll-fix-1` → preload never matches, CSS double-fetched on the critical path. Fix: preload the **exact** versioned URL. Keep the two in lockstep on every `?v=` bump.
- **1b. Faux-frost the 3 backdrop-filter leaks** (doc 16 "fixed-only"): `.hero-card` (blur 12px), `.pill-btn-glass` (blur 16px), `.partner-pill` (blur 12px). Replace live blur with layered faux-frost (near-opaque `--frost-bg` + gradient films + inset highlight) — premium glass, zero backdrop-filter paint on scroll.

## Workstream 2 — Whisper aurora + sun-glare

- **CSS fallback (`body::before`, mobile + reduced-motion baseline):** pull rose/amber/copper radial alphas down (rose `.06→.025`, amber `.05→.03`, copper `.05→.025`); keep violet/blue/cyan/teal a touch lower; drop global `saturate(135%→118%)`. Add a **sun-glare**: one warm large soft radial bloom high-center-right (`rgba(255,216,168,~.10)`) + faint tighter core — static, zero perf cost, works on mobile.
- **Canvas (`aurora.js`, desktop/fine-pointer only):** rebalance `BLOBS` — cut the **rose** blob (shrink + lower), tame the **copper** blob, lower all stop alphas (`0.55/0.22 → 0.34/0.14`), slow drift. Add one **sun blob** (warm `255,220,175`, upper area, soft, low-alpha). Drop `#auroraCanvas` opacity `0.92 → ~0.6`, soften blur/saturate for the whisper read.
- **Hero warm bloom:** a faint fixed warm glow near the hero light source (top-right) so the "sun" reads in the hero; layered into existing `.hero__glow`/backdrop, transform/opacity only.

## Workstream 3 — Motion & parallax awe (tasteful, not busy)

Grounded in `emil-design-eng` + `review-animations` standards: enter → ease-out, UI ≤ 300ms, springs for "alive" elements, stagger 30–80ms, GPU-only, interruptible, reduced-motion-safe.

- **3a. Fix the layout-prop animation.** `.brand-pill__label` reveal `grid-template-columns:0fr→1fr` → re-implement via `transform`/`clip-path`/`max-width`+opacity (GPU) so pill hover is jank-free.
- **3b. Reveal choreography.** Tighten `[data-reveal]`/`[data-stagger]`/blur-reveal timing + stagger into one cohesive Tahoe cadence; per-section entrance rhythm, not everything-at-once.
- **3c. Layered parallax depth (desktop/fine-pointer).** Refine existing scroll parallax (aurora, watermark, hero portrait, glow) into clean depth planes; gentle depth on one below-the-fold element. Transform-only, IO-gated, capped.
- **3d. Signature moments (2–3):** Hero showpiece (whisper aurora + sun-glare + liquid portrait + parallax as one cinematic frame); one scroll set-piece (Stats count-up + spotlight, or Experience expand); Footer as a calm confident closer.
- **3e. Micro-interactions.** Pill press (`scale .97`), magnetic CTA tuning, `.spec` spotlight softness, focus-visible polish, hairline/gloss micro-details.

## Workstream 4 — UI/UX uplift per section (balanced bold, tiny details)

Keep the shiny-chip/pill/glass vocabulary; elevate rhythm, hierarchy, materiality, and the small stuff.

- **Typography:** refine hero + section H2 scale, tracking, `text-wrap` balance/pretty, optical sizing; tighten vertical rhythm + `.sec-sub` spacing.
- **Depth & materiality:** consistent Tahoe glass/frost, restrained double-bezel on cards, cohesive shadow language, tinted rims per section `--tint`.
- **Per section:** hero (showpiece), about, create-band, services (hover-fill finesse), experience (rail + popover polish), skills, stats (dark-panel set-piece), education, footer. No fabricated content — copy stays CV-true (`portfolio.json`).
- **Tiny details:** focus rings, hairline consistency, chip gloss, icon alignment, hover microcopy, selection color, scrollbar, reduced-motion parity.

## Workstream 5 — AIDLC docs sweep (audit item #2)

- CLAUDE.md + `.cursor/skills/portfolio/SKILL.md`: **"00–15" → "00–18"**; add **`aurora.js` + `icons.js`** to JS-module/boot lists; note this doc.
- `.cursor/rules/architecture.mdc`: add `aurora.js`/`icons.js`; note SW `/assets/js/*` **excludes `/vendor/`**; drop/annotate `legacy/`.
- README.md: remove absolute machine path (`/Users/bs01616/...`) → portable; re-frame **content source = `portfolio.json`** (data.js = loader); fix structure tree (drop `legacy/`, add `scripts/ shots/ .agents/ .codex/ .cursor/ skills-lock.json`).
- `docs/aidlc/00-overview.md`: doc index → 18; drop stale "Lenis" claim.
- `docs/aidlc/01-design-system.md`: **fix DOM order** (remove nonexistent "Portfolio", add "Services"); fix **"brush radius 143px" → fractional `BRUSH_FRACTION 0.34`**; refresh palette/motion notes.
- `docs/aidlc/02-content-map.md`: fix **`.hero-portrait` 3:4 "no cover crop"** claim (reality: `object-fit:cover` banner); relabel Stats **"Derived" → static**; fix BS23 4th role label (Senior SE on contract).
- `docs/aidlc/04-gaps.md`: fix the **self-contradiction** (canvas aurora *does* ship; **Lenis does not**).
- CLAUDE.md: correct `impeccable` "locked" framing (vendored/unlocked) and `.codex/hooks.json` "optional local" framing (it's committed).

---

## Execution tranches

- **A — Foundation (perf/correctness + aurora):** 1a early-hint, 1b faux-frost ×3, WS2 whisper aurora + sun-glare. *(objective, perf-safe)*
- **B — Docs sweep:** WS5 reconciliation edits.
- **C — Motion & parallax:** WS3 (grid→transform fix first, then choreography, parallax, signature moments).
- **D — UI/UX polish:** WS4 per-section, tiny details.
- **E — Verify:** self-review vs checklist; flag items only the user can measure (Lighthouse post-deploy).

## Verification checklist

- [ ] No new network requests — none added.
- [ ] No `backdrop-filter` on any scrolling surface (only fixed chrome).
- [ ] No animated layout properties (brand-pill reveal moved to transform/clip-path).
- [ ] Every animation gated by `prefers-reduced-motion`; content visible when reduced.
- [ ] Heavy effects gated `finePointer && !reduced` (mobile never loads canvas/liquid/parallax).
- [ ] No new Tailwind classes in HTML (no `tailwind.css` rebuild needed).
- [ ] Responsive spot-check 360 / 768 / 1024 / 1440; `100dvh`.
- [ ] Aurora reads calm/cool, no red/pink dominance; sun-glare present but whisper-subtle.
- [ ] Copy unchanged / CV-true; no fabricated content.
- [ ] `?v=` cache-bust bumped on `styles.css` (+ early-hint kept in lockstep) when shipping.
- [ ] User to confirm PageSpeed 100 (mobile + web) post-deploy (can't run Lighthouse in this env).
