# CLAUDE.md — portfolio-cloudflare

Personal portfolio for **Mohammad Saniyat Hossain** (Staff Software Engineer). Static site built on the
**Lumora** template, styled as a **macOS Tahoe "Liquid Glass"** design, served by a **Cloudflare Worker**.
Stack: **Astro** static HTML + **Preact islands** + strict-TypeScript browser effects (`src/client`), **Tailwind (precompiled)** + a hand-written design system,
system **SF Pro** fonts. No runtime build step.

## Layout
- `public/` — the deployed site. Entry `public/index.html`; browser JS is **TypeScript in `src/client/*.ts`** (entries) + `src/client/lib/**`,
  bundled by `scripts/build-client.ts` into `public/assets/js/<name>.min.js` (generated, gitignored; `sw.ts` → `public/sw.js`, doc 60); CSS in
  `public/assets/css/` (`styles.css` = the design system, `tailwind.css` = precompiled utilities).
- `src/index.ts` — Cloudflare Worker entry (TypeScript, thin adapter). Pipeline in `src/worker/WorkerApplication.ts`; controllers in
  `src/worker/controllers/`, security modules in `src/worker/security/`, composition root `src/worker/bootstrap/`, policy values in
  `src/content/security.json` (docs 57–58).
- `scripts/` — TypeScript Node tooling run with `node scripts/<name>.ts` (build: `sync-head`, `build-client`, `optimize-images`, `hash-sw`…; checks: `behavior-check`, `dom-diff`, `fouc-check`…; doc 61).
- `docs/aidlc/` — **design history & rationale** (00–53; index in `00-overview.md`). Read these before large design changes; add
  each new piece of work as the next numbered doc (`NN-kebab-title.md`, next = **62**).

## Conventions (important)
- **Single content source:** `public/assets/data/portfolio.json` → `data.js`. Never fabricate CV content; it
  mirrors `docs/cv-modern-template.md`.
- **`<head>` is generated:** run `node scripts/sync-head.ts` after editing `site`/`profile` in the JSON. Do **not**
  hand-edit inside the `<!-- SYNC:HEAD -->` / `<!-- SYNC:H1 -->` markers in `index.html`.
- **No inline `style=""`** in HTML — use JSX `style` objects or JS `el.style` only. **No Alpine** (removed, doc 61): interactivity is Preact islands (`src/islands`), delegated `data-action` / `data-nav-target` attributes (`src/client/actions.ts`) and plain modules.
- **CSS:** prefer custom classes + design tokens in `styles.css`. Only run `./build-css.sh` if you add new
  **Tailwind utility** classes to the HTML (regenerates the gitignored `tailwind.css` with the pinned npm Tailwind v4 CLI;
  see `tailwind.input.css` for the v3-parity rules). Generated `*.min.js`/`*.min.css`/`tailwind.css` are gitignored.
- **Design tokens:** `--tint`/`--tint-deep` (per-section + `[data-ci]` hue map), `--text-sh*` shadows,
  `--ease-glass`, glass primitives (`.glass-panel`/`.glass-card`), shiny icon tiles (`.icon-chip`,
  `.service-row__icon`), `.brand-pill`, `.beam`/`.sheen`/`.spec` effects.
- **Git (HARD RULE, `docs/aidlc/48` rule 4):** no `Co-Authored-By: Claude`/AI trailer or "Generated with" footer in
  commits or PRs; never commit without the owner's explicit go-ahead; never push, merge or deploy unless the owner
  says so in that turn; stage files by name.
- **Data in JSON, logic in code (doc 54 §1a):** content, labels, vocabularies, brand/colour tables, thresholds, fallback
  values live in `portfolio.json` / `src/content/*.json` (Zod-validated), never as literals in `src/`.
- **Error / outage pages:** all failures (404, 500, 502, 503 maintenance, offline) render the site-themed outage page (glass panel, orb + circular retry timer, nested shell-console strip; doc 58) from
  `src/content/errors.json` via `src/components/ErrorTerminal.astro`; add a failure mode by adding a JSON entry.
- **Security (doc 57):** every Worker rejection goes through `logSecurityEvent` (severity low→critical, forensic IP/ASN/UA/ray
  context); admin read is `Authorization: Bearer` only; new endpoints must add origin check, body cap and a rate limit.
  Client/device details come from `worker/services/ClientProfileService` (tables in `src/content/clientSignatures.json`, DTOs in
  `types/ClientProfile.ts`, doc 58). Islands use **Preact** (`preact/hooks`), not React.
- **Logging:** Worker logs go through `src/worker/logging` (channels in `src/content/logging.json`, `LOG_CHANNEL`
  override); never `console.*` directly, never expose exception details on a page.
- **Engineering standards (doc 54):** strict TS + DTOs/enums/Zod, Laravel-style `src/` layers, DRY/SOLID, meaningful
  names (no single-letter identifiers), 5W logging + Artisan-style script output, ESLint/Prettier, least-privilege
  security, PWA/browser compat — never at the cost of performance or UX. Node = `.nvmrc` (26.13.1 LTS).
- **Non-negotiables:** keep Google **PageSpeed**/**SEO**/**CSP** intact, **no new network requests** (fonts/icons
  are local), light-only theme, every animation gated by `prefers-reduced-motion`, responsive rem/vw grid verified
  at 360 / 768 / 1024 / 1440. Deploy via `./deploy.sh` (Wrangler).
- **Feature flags / maintenance / analytics** (see `docs/aidlc/39`): soft per-section "under construction" notices
  live in `site.features.underConstruction.<key>` (read at build time by the Astro components / islands); site-wide **maintenance mode** is
  the Worker `MAINTENANCE_MODE` var (503, `?preview=<ADMIN_TOKEN>` bypass). **Analytics** is opt-in via
  `site.analytics` — empty = zero requests (the "no new network requests" rule holds for the default build); setting
  a `googleId`/`cloudflareToken` is a deliberate exception (hosts already CSP-allow-listed in `src/worker/security/headers.ts`).

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
