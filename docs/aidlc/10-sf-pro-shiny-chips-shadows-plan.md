# Plan: Typography (SF Pro Tahoe), shiny tinted chips everywhere, per-designation colours, hero-name backing, designed shadows

> Archived from `~/.claude/plans/get-the-context-of-peppy-blum.md` into `docs/aidlc/` and executed.
> Implementation notes in `docs/aidlc/05-redesign-liquid-glass.md` §12.

---

## ACTIVE TASK

### Context
User feedback on the shipped design: (1) **disliked the font** — the stack currently leads with `"Inter"`
(`styles.css:67`) so every device renders Inter, not the macOS-Tahoe SF Pro they want; the referenced
`cursor-presentation` leads with `-apple-system … "SF Pro Display"/"SF Pro Text"` (Inter only as fallback).
(2) **Disliked the dark box** that appears behind the hero name over the portrait (`.hero__copy--on-dark::before`,
`styles.css:702`) — most visible under "Hossain". (3) **Loved the shiny tinted icon tile** beside each item in
the "What I build" (Services) list — wants that **shining chip used everywhere**, with different tones/colours
used properly. (4) Wants **each designation (role) in Experience to use a different colour for its points**,
with those loved shiny chips as the point markers. (5) Overall **Apple macOS Tahoe typography + modern UI/UX**,
with **designed subtitle shadows and varied shadow styles** — inspirations from the Lumora theme prompt +
`cursor-presentation`.

The loved "shiny tile" is one formula reused in `.icon-chip` (`styles.css:857`), `.service-row__icon`
(`styles.css:966`) and `.exp-row__icon` (`styles.css:1135`): `linear-gradient(145deg, color-mix(--tint 32%,#fff),
color-mix(--tint 12%,#fff))` fill + `1px color-mix(--tint …)` rim + inset white highlight + soft `--tint` shadow,
glyph coloured `--tint-deep`. It already recolours from the per-section / per-item `--tint`/`[data-ci]` drivers.

### Decisions (confirmed with user)
- **Font:** SF Pro **system-first** (reorder stack; Inter = cross-platform fallback); refine weights/tracking/optical sizing.
- **Hero name backing:** **keep but restyle softer** — lighter, blurrier, feathered edges, tied to the theme tint (no dark card).
- **Point markers:** **mini shiny icon-chip** (the Services tile look) with a check glyph, coloured per designation.

---

### A. Font → SF Pro system-first (Tahoe)  (`public/assets/css/styles.css` + head/worker perf)
- Reorder `--font-sans` (`styles.css:67`) to lead with the Apple system stack, exactly like the reference:
  `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", ui-sans-serif, system-ui,
  "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Apple devices → true SF Pro; others → Inter.
- Keep the self-hosted Inter `@font-face` (`styles.css:82`) + `font-display: swap` as the non-Apple fallback.
- **Perf (Inter now fallback-only):** remove the render-blocking Inter **preload** — in `scripts/sync-head.js`
  (the `<link rel="preload" … inter-latin.woff2>` line) and the Worker `EARLY_HINTS` (`src/index.js:12`), then
  regenerate the head (`node scripts/sync-head.js`). On the Apple path there's now zero font download; non-Apple
  loads Inter via swap. (Keeps "no wasted high-priority request".)
- Refine display type toward Tahoe: confirm `font-optical-sizing: auto`, keep `font-feature-settings:"kern","liga","calt"`,
  tighten heading tracking (`-0.02…-0.035em`), body `-0.011em`; antialiasing already global (`styles.css:110`).

### B. Hero-name backing → softer frosted, theme-tinted  (`styles.css` `.hero__copy--on-dark::before`, ~702)
Replace the dark card with a **soft feathered frosted halo**: drop the `rgba(10,10,10,.22)` fill + hard border;
use a low-alpha light/tinted frost (`color-mix(--primary … )` at very low alpha over a stronger `blur()`), and
**feather the edges** with a `-webkit-mask`/`mask: radial-gradient(… transparent)` (or a large gradient fade) so
there is no visible box — it reads as a subtle glow that lifts the text off the portrait. Keep the readable
white-ink + warm-gold-grad line treatment (`styles.css:714-725`); verify legibility on both light and dark crops.

### C. Shiny tinted chip system — used everywhere, proper tones  (`styles.css`; a few classes in `index.html`)
- **Add a gloss/shine** to the shared tile so it reads "shiny": on `.icon-chip, .service-row__icon, .exp-row__icon`
  add a subtle diagonal specular streak (a `::before`/inset `linear-gradient` top-left highlight) and a gentle
  **hover brighten** (scale already on service/exp; add a quick gloss on hover). One grouped rule so all three stay identical.
- **Propagate to the flat icon accents** so each picks up its context `--tint` (tones differ per section automatically):
  - Hero status chips (`index.html:199-201`, currently `icon-chip--muted`) → tinted (hero azure).
  - Education logo tile (`.edu-row__logo`, `styles.css:222`, neutral white) → add a per-edu `--tint` rim + soft
    coloured shadow (keep the white plate so logos stay legible).
  - Prominent arrows/muted chips that should feel alive → tint with `--tint`/`--tint-deep` (keep genuinely
    secondary ones quiet). Nav-overlay / footer chips stay on their `--on-dark` variant.
- Keep it tasteful: vivid gradient/rim for tiles, `--tint-deep` for the glyph (AA), copper stays the Services + brand tone.

### D. Per-designation colours + shiny check-chip point markers  (`index.html` binding + `styles.css`)
- **Per-role hue:** bind `:data-ci` on each `.exp-item` in the roles loop (`index.html:305`,
  `x-for="(role, ri) in group.roles"`), cycling an 8-hue palette so adjacent designations differ — e.g.
  `:data-ci="['blue','purple','teal','orange','cyan','pink','indigo','green'][(gi + ri) % 8]"` (BS23's 4 stacked
  roles get 4 distinct hues). `[data-ci]` (`styles.css:294`) sets `--tint`/`--tint-deep` on the item → the role's
  `.exp-row__icon` tile **and** its point markers recolour automatically. (Attribute binding, not a Tailwind class → no rebuild.)
- **Point markers = mini shiny icon-chips:** restyle `.exp-details__list li` (`styles.css:1232`, currently
  `list-style: disc`): `list-style:none`, `position:relative`, left padding; a `::before` shiny tinted tile
  (the icon-chip formula, ~1rem rounded, gradient + rim + inset highlight + soft `--tint` shadow) and a `::after`
  **pure-CSS check** (rotated border, coloured `--tint-deep`) centred in it — a glossy coloured check chip per point.
  **No new asset/network** (glyph is CSS-drawn, not a fetched SVG). Text stays `rgba(17,17,17,.72)` for AA.

### E. Designed shadow typography (subtitles + varied styles)  (`styles.css` tokens + usages)
- Keep `--text-sh`/`--text-sh-sm`/`--text-sh-dark`; add a crisp **emboss** variant for labels/eyebrows on light
  and (optionally) a very-low-alpha **tinted** heading glow (`color-mix(--tint …)`) for section H2s to add colour depth.
- Apply with variety (subtle, so SF stays crisp): eyebrows/labels → emboss; section subtitles & card descriptions →
  `--text-sh-sm` soft depth (extend where still flat); hero secondary → soft light glow; dark-panel text (stats/footer/
  nav) → `--text-sh-dark`. Mirror the `cursor-presentation` `.subtitle{ text-shadow:var(--text-sh-sm) }` intent.

### F. Constraints / perf
- **No inline `style=""`** — per-role colour via `:data-ci` binding; everything else via custom classes + tokens →
  **no Tailwind rebuild** (no new utility classes in HTML).
- **No new network requests** — SF Pro is system (no download), point-marker glyph is CSS-drawn; Inter preload is
  *removed* (net win). CSP / Worker otherwise untouched; light-only; `portfolio.json` single source (no content edits).
- Reduced-motion, responsive rem/vw grid, mobile blur fallback all preserved (new work is static styling + one
  attribute binding). Reuse `--tint`/`--tint-deep`, `[data-ci]` map, `.icon-chip` formula, `iconSvg()`.

### Files
- `public/assets/css/styles.css` — **primary**: font stack, hero-name backing, shiny-chip gloss + propagation,
  `.exp-details__list li` markers, per-role tints via existing `[data-ci]`, shadow tokens/usages.
- `public/index.html` — `:data-ci` on `.exp-item`; add tint classes to hero-status / edu-logo chips (custom classes).
- `scripts/sync-head.js` + `src/index.js` — drop the Inter preload / Early Hint; regenerate head via `node scripts/sync-head.js`.
- `docs/aidlc/{01,05,07}` — record the SF-first stack, shiny-chip system, per-designation hue, shadow variants, preload change.

### Verification
1. No Tailwind rebuild expected (custom classes only). Regenerate head: `node scripts/sync-head.js`.
2. Serve: `npx wrangler dev` (prod-like) or `python3 -m http.server 8080 --directory public`; hard-refresh (⌘⇧R).
3. Manual QA:
   - **Font:** on macOS the site renders SF Pro (Tahoe), not Inter; headings/body feel crisp; non-Apple falls back to Inter.
   - **Hero name:** no dark box behind the name; "Hossain" reads cleanly over the portrait via the soft feathered halo.
   - **Shiny chips:** the loved gradient tile appears consistently across sections, each in its section/item tone; has a subtle shine + hover gloss.
   - **Experience:** each designation shows a distinct hue; its point bullets are glossy coloured check-chips in that hue.
   - **Shadows:** subtitles/labels carry designed depth; text stays sharp (not blurry); dark-panel text legible.
   - Reduced-motion on → nothing animates; content fully visible. Responsive 360/768/1024/1440+ — no clipping; AA contrast on tinted text.
4. Regression: Lighthouse/PageSpeed Performance/SEO/Best-Practices/A11y unchanged-or-better; **no new network requests** (verify Inter only loads on non-Apple; no fetched marker SVG); **no CSP violations**.

---

## DONE (changelog)
- **Colour variety + hero cascade + deeper glass + signature motion** — `--grad-warm-*` (Hossain copper→gold),
  per-line hero cascade, `--c-green`/`--c-mint`/`--grad-soft`, Education green tint, deeper hue-tinted glass
  primitives, border-beam + panel spotlight (`.spec--panel`) + aurora parallax (`--aurora-y`/`--glow-y`) + sheen.
  (Shipped — `styles.css` :root + `1659+`, `motion.js` `auroraParallax`, `index.html` beam/sheen/spec classes.)
- **Fixed stack/AI pill collapsed circle** — moved padding off the collapsing grid item onto `.brand-pill__label-in`
  so the `0fr` track collapses to true 0 → perfect circle. (Shipped.)
- **Typography + photo-driven Tahoe colour harmony** — cool azure/teal primary + copper accent from the portrait,
  per-section `--tint`, `text-wrap: balance/pretty`. (Shipped — superseded by the SF-first font change above.)
- **Shadow depth + slide-13 multi-hue cards** — `--text-sh-sm`/`--text-sh-dark`, `[data-ci]` hue map,
  coloured card top-borders, vivid stats hues on the dark panel. (Shipped — see `styles.css:294`.)
- **Tahoe motion/material base** — `--ease-glass`, soft-light sheen film, softened `motion.js` springs,
  Tahoe ambient palette, reconciled `docs/aidlc/04-gaps.md`. (Shipped.)
