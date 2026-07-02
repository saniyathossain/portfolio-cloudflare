# Plan: Restore loader, hero brand watermark, clean-ink hero colour, aesthetic bullet markers, section subtitles + designed shadow

> Archived from `~/.claude/plans/get-the-context-of-peppy-blum.md` into `docs/aidlc/` and executed.

---

## ACTIVE TASK

### Context
Feedback after the SF-Pro / shiny-chip / per-designation pass shipped (see DONE changelog). Five issues:
1. **The 000→100 loader "panel" is gone on reload** — [loader.js:61](public/assets/js/loader.js#L61) skips the whole
   loader after the first visit via `sessionStorage("portfolio-visited")`, so it only ever shows once.
2. **Missing theme element** — the Lumora template's signature **hero brand watermark** (big translucent brand
   text) exists only in the footer here (`.site-footer__wm`, `styles.css:1636`); the hero has none.
3. **Hero name colour combo reads busy/off** — currently line-1 ink-blue, line-2 bright azure `#2f9fd6`
   (`styles.css:772`, low-contrast on white), line-3 warm copper-gold `.grad`; the cool+warm mix looks unprofessional.
4. **Experience bullet markers need polish** — they're a CSS-drawn check in a chip (`styles.css:1302-1323`); user
   wants a more aesthetic pill / real colour icon per point.
5. **The cursor-presentation `.subtitle` treatment isn't used** — that project puts a descriptive subtitle line
   under each title with `text-shadow: var(--text-sh-sm)` (`cursor-presentation assets/styles.css:124`). The portfolio
   has no subtitle lines under section H2s, so that designed shadow "isn't used anywhere".

Constraints reaffirmed: **maintain Google PageSpeed + SEO**, keep light-only, CSP/Worker intact, `portfolio.json`
single content source (no fabricated claims — subtitle copy derives from real CV facts), no new network requests,
no Tailwind rebuild (custom classes + attribute bindings only). Inspirations: the Lumora theme prompt + `cursor-presentation`.

### Decisions (confirmed with user)
- **Hero colour:** **Clean ink + copper** — Mohammad + Saniyat near-black ink, Hossain copper accent; glow retuned neutral-warm.
- **Subtitles:** **Add** a short CV-derived subtitle under each section heading, carrying the cursor-presentation designed shadow.

---

### 1. Restore the 000→100 loader  (`public/assets/js/loader.js`)
Remove the `sessionStorage.getItem("portfolio-visited")` early-skip (`loader.js:60-65`) so the loader plays on every
load like the template. Keep the `prefers-reduced-motion` → `skipLoader()` path and the GPU `scaleX` fill + count
(`loader.js:80-96`). (Setting the visited flag can stay or go — just don't gate on it.) No CSS change (markup/styles exist).

### 2. Add the missing hero brand watermark  (`index.html` hero + `styles.css`)
Add a large, subtle **"SANIYAT"** watermark inside `#home`, mirroring the footer treatment (`--watermark` token,
`.site-footer__wm` formula): `<p class="hero__wm" aria-hidden="true" x-text="profile.shortName.toUpperCase()">`
placed low/behind the copy, `position:absolute; pointer-events:none; user-select:none; z-index:1` (under the
`.hero__grid` content at z-20, above the backdrop), very low opacity so it **blends with the portrait** on the right;
smaller/again-fainter on mobile. Pure text → **no LCP/CLS/network impact**.

### 3. Hero colour → clean ink + copper  (`styles.css` hero name + glow)
- Hero name lines (`styles.css:768-777`): line-1 (Mohammad) + line-2 (Saniyat) → near-black ink (`var(--ink)`, drop
  the azure line-2 rule); line-3 (Hossain) keeps `.grad` but retuned to a **cohesive copper** (accent-dark → accent →
  accent-bright, not gold) so it reads as one clean brand accent. Keep the `.hero__copy--on-dark` white-ink + copper
  overrides (`styles.css:761-765`) for legibility over the portrait.
- Retune `.hero__glow` (`styles.css` ~615) from azure/cyan/amber to a **neutral warm-white + faint copper** wash
  (subtle) so the hero reads professional, not colourful. Leave the ambient aurora as-is (background).
- Contrast: near-black on the light hero = AA+; verify the on-dark flip still passes.

### 4. Experience bullet markers → aesthetic shiny chip + real colour icon  (`index.html` + `styles.css`)
Replace the CSS-drawn check with a **real inline check icon inside a glossy per-designation chip** (crisper, matches
the loved Services tile):
- `index.html` details list (`index.html:342-345`): render a marker span per point —
  `<li><span class="point-chip" aria-hidden="true" x-html="iconSvg('check','ui-icon')"></span><span x-text="d"></span></li>`.
  (`iconSvg('check')` is registered — `icons.js:11` — so it inlines a local SVG; **no network**.)
- `styles.css`: replace `.exp-details__list li::before/::after` (`1302-1323`) with `.point-chip` = the shiny tinted
  chip formula (gradient fill + `--tint` rim + inset highlight + soft `--tint` shadow), sized ~1.15rem rounded, icon
  coloured `--tint-deep`; `list-style:none`, flex/`gap` li. Colour inherits from `.exp-item[data-ci]` (already set,
  `index.html:304`) → one distinct hue per designation. AA text unchanged (`rgba(17,17,17,.72)`).

### 5. Section subtitles + the cursor-presentation designed shadow  (`portfolio.json` + `app.js` + `index.html` + `styles.css`)
- **Copy (CV-derived, single source):** add a `sections` map to `public/assets/data/portfolio.json`, e.g.
  - Services: `"Backend, architecture, APIs, and AI-assisted delivery."`
  - Experience: `"14+ years · 8 roles across 5 companies."`  (years/roles/companies all live in the data)
  - Skills: `"Languages, frameworks, data, platform, and AI in the flow."`
  - Education: `"Electronics & Telecommunication Engineering — Dhaka."`
  Expose via `app.js` (`sections: D.sections`, alongside `services`/`skills` at `app.js:17`).
- **Markup:** under each section `<h2>` add `<p class="sec-sub" x-text="sections.<key>"></p>` (Services/Experience/
  Skills/Education). Titles stay as-is.
- **Style `.sec-sub`:** the portfolio's subtitle element — `font-size: clamp(0.95rem,1.4vw,1.1rem);
  color: rgba(17,17,17,.6); max-width: ~48ch; margin-top: 0.5rem; text-shadow: var(--text-sh-sm);` (mirrors
  `cursor-presentation .subtitle`). This finally **uses the designed subtitle shadow** on a real subtitle. Keep it
  crisp; on-dark sections (Stats) would use `--text-sh-dark` if a subtitle is added there (optional; default: skip Stats/About).

### Constraints / perf / SEO
- No inline `style=""`; per-designation colour via existing `:data-ci`; everything else custom classes + `x-text`/
  `x-html` bindings → **no Tailwind rebuild**. No new network requests (SF system font; marker icon inlined; watermark
  is text). CSP/Worker untouched. Loader always-on has no PageSpeed cost (post-load rAF). Watermark/subtitles are text
  → no CLS/LCP regression. Reduced-motion + responsive (360/768/1024/1440) preserved.

### Files
- `public/assets/js/loader.js` — drop the sessionStorage skip.
- `public/index.html` — hero `.hero__wm`; per-section `.sec-sub`; experience marker span with `iconSvg('check')`.
- `public/assets/css/styles.css` — hero name ink+copper, glow retune, `.hero__wm`, `.sec-sub`, `.point-chip` (replaces the ::before/::after check).
- `public/assets/data/portfolio.json` — `sections` subtitle copy; `public/assets/js/app.js` — expose `sections`.
- `docs/aidlc/{04,05,01}` — note the restored loader, hero watermark, subtitle element, hero-colour change.

### Verification
1. No Tailwind rebuild (custom classes only). Serve: `npx wrangler dev` or `python3 -m http.server 8080 --directory public`; hard-refresh (⌘⇧R).
2. Manual QA:
   - **Loader** plays the 000→100 panel on every load (not just first visit); reduced-motion still skips it.
   - **Hero watermark** shows large + subtle behind the hero, blended with the portrait; no layout shift.
   - **Hero name** reads Mohammad + Saniyat in clean near-black ink, Hossain in copper — professional, no cool/warm clash; legible over the portrait.
   - **Experience** each designation's points show a glossy coloured check-chip in that designation's hue.
   - **Subtitles** appear under Services/Experience/Skills/Education with a visibly designed (but crisp) shadow; copy matches the CV facts.
   - Reduced-motion on → nothing animates, content visible. Responsive at 360/768/1024/1440 — nothing clips; AA contrast on ink/copper/tinted text.
3. Regression: Lighthouse/PageSpeed Performance/SEO/Best-Practices/A11y unchanged-or-better; **no new network requests**; **no CSP violations**.

---

## DONE (changelog)
- **SF-Pro font + shiny chips everywhere + per-designation colours + softer hero backing + designed shadows** —
  `--font-sans` reordered to `-apple-system … "SF Pro Display/Text","Inter"` (Inter preload dropped from
  `sync-head.js` + `src/index.js`); shiny tinted-chip gloss propagated; `.exp-item :data-ci` per role;
  `--text-sh-emboss`/`--text-sh-tint` tokens; softer frosted hero-name backing. (Shipped — see
  `docs/aidlc/10-sf-pro-shiny-chips-shadows-plan.md`.)
- **Colour variety + hero cascade + deeper glass + signature motion** — `--grad-warm-*`, `--c-green`/`--c-mint`/
  `--grad-soft`, Education green tint, deeper hue-tinted glass, border-beam + panel spotlight (`.spec--panel`) +
  aurora parallax + sheen. (Shipped.)
- **Stack/AI pill collapsed circle fix**, **photo-driven Tahoe colour harmony**, **shadow depth + slide-13
  `[data-ci]` cards**, **Tahoe motion/material base**. (Shipped — see earlier docs 06/09.)
