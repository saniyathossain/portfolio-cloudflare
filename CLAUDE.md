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
- `docs/aidlc/` — **design history & rationale** (00–53; index in `00-overview.md`). Read these before large design changes; add
  each new piece of work as the next numbered doc (`NN-kebab-title.md`, next = **54**).

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
- **Git (HARD RULE, `docs/aidlc/48` rule 4):** no `Co-Authored-By: Claude`/AI trailer or "Generated with" footer in
  commits or PRs; never commit without the owner's explicit go-ahead; never push, merge or deploy unless the owner
  says so in that turn; stage files by name.
- **Non-negotiables:** keep Google **PageSpeed**/**SEO**/**CSP** intact, **no new network requests** (fonts/icons
  are local), light-only theme, every animation gated by `prefers-reduced-motion`, responsive rem/vw grid verified
  at 360 / 768 / 1024 / 1440. Deploy via `./deploy.sh` (Wrangler).
- **Feature flags / maintenance / analytics** (see `docs/aidlc/39`): soft per-section "under construction" notices
  live in `site.features.underConstruction.<key>` (read via Alpine `uc('<key>')`); site-wide **maintenance mode** is
  the Worker `MAINTENANCE_MODE` var (503, `?preview=<ADMIN_TOKEN>` bypass). **Analytics** is opt-in via
  `site.analytics` — empty = zero requests (the "no new network requests" rule holds for the default build); setting
  a `googleId`/`cloudflareToken` is a deliberate exception (hosts already CSP-allow-listed in `src/index.js`).

## Skills (design / frontend)

- **Project skill (read first for this repo):** `.cursor/skills/portfolio/SKILL.md`
- **Installed skills:** pinned in `skills-lock.json` (58 entries) — **only the lock is committed**; skill folders in
  `.agents/skills/` (+ symlinks in `.claude/skills/`) are gitignored. Restore after clone with
  `npx skills experimental_install`, update with `npx skills update -p -y`, then commit the lock.
  Design taste: `design-taste-frontend`, `high-end-visual-design`, `emil-design-eng`, etc. `impeccable` is vendored
  **unlocked** (its `scripts/` power the hook below).
- **Stack-migration skills (doc 52):** `astro`, `shadcn` (official), `vercel-react-best-practices`,
  `workers-best-practices` (Cloudflare official). New skills: `npx skills add <repo> -s <skill>`, keep the folder in
  `.agents/skills/` with a symlink from `.claude/skills/`, commit only `skills-lock.json`.
- **Cursor rules:** `.cursor/rules/` — architecture, design-system, content-source
- **PostToolUse hook:** `.codex/hooks.json` → impeccable UI check after Edit/Write (committed — runs for every clone)
- **Local only (gitignored):** `.impeccable/config.local.json`, `.cursor/hooks.json`, `.cursor/debug-*.log`
