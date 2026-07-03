# Gaps vs Lumora Base Template

| Lumora feature | Status |
|----------------|--------|
| Lenis smooth scroll | **Removed** — Lenis blocked the wheel while scroll was locked; native scroll everywhere. (Canvas aurora *does* ship — `aurora.js`, desktop/fine-pointer — alongside the CSS fallback.) (`17`) |
| Liquid hero (before/after photos) | Reused as a single-portrait liquid grayscale→colour cursor reveal |
| Portfolio "Selected Work" (4 dark project cards) | **Replaced by the Experience timeline** — there is no `projects` data; a personal engineer's work is represented as the company/role experience section, which is richer (company groups → expandable roles → tenure popovers → stack/AI pills) |
| Services hover rows | **Lumora hover-fill** — index cell, surface fill, transform shift (`17`) |
| Live clock | Implemented |
| Per-role experience expand | Implemented (BS23 has 4 independent toggles) |
| ThemeForest i18n | Out of scope |
| Dark mode toggle | Out of scope (light-only, confirmed) |
| Real contact form backend | Stubbed modal submit |
| Devicon stack icons | Real Simple Icons brand SVGs (local, brand-coloured) + monogram fallback |
| Magnetic CTAs / card tilt | Added via Motion One (`motion.js`) |
| Font | Self-hosted Inter woff2 (cross-platform); system stack as instant fallback |
| Static SEO meta | Prebuild `scripts/sync-head.js` from `portfolio.json` |
| PWA installable | `manifest.webmanifest` + `sw.js` + icon set |
| Signature motion touches | Gradient border-beam, panel cursor spotlight, **canvas aurora + CSS fallback** (whisper-rebalanced + sun-glare, `18`), layered hero parallax, sheen sweep — desktop-gated, reduced-motion safe. Lenis smooth-scroll was explored then removed. (`17`,`18`) |
| Shiny tinted chip system | Gloss streak + per-context `--tint` on icon tiles, service/exp icons, hero-status chips, edu logo rims, per-role `.point-chip` check markers (see `05-redesign-liquid-glass.md` §12–13) |
| Hero brand watermark | `.hero__wm` — large translucent `profile.shortName` behind hero grid (Lumora signature element) |
| Section subtitles | `.sec-sub` under Services/Experience/Skills/Education H2s; copy from `portfolio.json` `sections` map |
| Hero partners strip | `.partner-pill` — frosted logo + name pills (see `15-agent-context-partner-pill-revert.md`) |
| Agent / Cursor context | `.cursor/skills/portfolio/SKILL.md`, `.cursor/rules/*`, `CLAUDE.md` |

## Current section order (DOM)

PageLoader → Header → Hero → About → CreateBand → Services → **Experience** → Skills → Stats →
Education → Footer → NavMenu (overlay) → RequestModal (overlay).

> Note: earlier drafts of this doc referenced a "Portfolio 4 dark cards" section fed from
> `projects.json` and "Services between Portfolio and Experience". Neither exists — that content
> was intentionally consolidated into the **Experience** timeline. See
> `06-tahoe-refinement-plan.md` for the macOS Tahoe "Liquid Glass" refinement pass applied on top
> of this base.
