# CLAUDE.md — portfolio-cloudflare

Personal portfolio for **Mohammad Saniyat Hossain** (Staff Software Engineer). Static site built on the
**Lumora** template, styled as a **macOS Tahoe "Liquid Glass"** design, served by a **Cloudflare Worker**.
Stack: plain HTML + **Alpine.js** + **Motion One**, **Tailwind (precompiled)** + a hand-written design system,
system **SF Pro** fonts. No runtime build step.

## Layout
- `public/` — the deployed site. Entry `public/index.html`; JS in `public/assets/js/` (`data.js`, `app.js`,
  `boot.js`, `icons.js`, `loader.js`, `motion.js`, `reveal.js`, `blur-reveal.js`, `liquid-hero.js`, `aurora.js`); CSS in
  `public/assets/css/` (`styles.css` = the design system, `tailwind.css` = precompiled utilities).
- `src/index.js` — Cloudflare Worker: serves `public/`, sets security headers + **CSP**, early-hint preloads.
- `scripts/` — `sync-head.js` (generates `<head>` + h1 from data), `optimize-images.js`, `hash-sw.js`.
- `docs/aidlc/` — **design history & rationale** (00–18). Read these before large design changes.

## Conventions (important)
- **Single content source:** `public/assets/data/portfolio.json` → `data.js`. Never fabricate CV content; it
  mirrors `docs/cv-modern-template.md`.
- **`<head>` is generated:** run `node scripts/sync-head.js` after editing `site`/`profile` in the JSON. Do **not**
  hand-edit inside the `<!-- SYNC:HEAD -->` / `<!-- SYNC:H1 -->` markers in `index.html`.
- **No inline `style=""`** in HTML — use Alpine `:style` / `x-bind` or JS `el.style` only.
- **CSS:** prefer custom classes + design tokens in `styles.css`. Only run `./build-css.sh` if you add new
  **Tailwind utility** classes to the HTML (regenerates `tailwind.css`; downloads the standalone CLI to `bin/`).
- **Design tokens:** `--tint`/`--tint-deep` (per-section + `[data-ci]` hue map), `--text-sh*` shadows,
  `--ease-glass`, glass primitives (`.glass-panel`/`.glass-card`), shiny icon tiles (`.icon-chip`,
  `.service-row__icon`), `.brand-pill`, `.beam`/`.sheen`/`.spec` effects.
- **Non-negotiables:** keep Google **PageSpeed**/**SEO**/**CSP** intact, **no new network requests** (fonts/icons
  are local), light-only theme, every animation gated by `prefers-reduced-motion`, responsive rem/vw grid verified
  at 360 / 768 / 1024 / 1440. Deploy via `./deploy.sh` (Wrangler).

## Skills (design / frontend)

- **Project skill (read first for this repo):** `.cursor/skills/portfolio/SKILL.md`
- **Design taste (installed):** `.agents/skills/` — 16 locked in `skills-lock.json` (`design-taste-frontend`, `high-end-visual-design`, etc.); `impeccable` is vendored **unlocked** (its `scripts/` power the hook below).
- **Cursor rules:** `.cursor/rules/` — architecture, design-system, content-source
- **PostToolUse hook:** `.codex/hooks.json` → impeccable UI check after Edit/Write (committed — runs for every clone)
- **Local only (gitignored):** `.impeccable/config.local.json`, `.cursor/hooks.json`, `.cursor/debug-*.log`
