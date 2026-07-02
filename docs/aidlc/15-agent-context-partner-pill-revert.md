# 15 — Agent context, `.gitignore`, partner-pill revert

## Summary
Captured project context for Cursor/Claude agents and **reverted** the hero partner / chip “liquid glass” experiments
that replaced the established shiny-chip language.

## Agent context (committed)
| Path | Role |
|------|------|
| `.cursor/skills/portfolio/SKILL.md` | Primary project skill — stack, boot, design rules, deploy checklist |
| `.cursor/rules/architecture.mdc` | Always-on architecture (Worker, boot chain, SW, sync-head) |
| `.cursor/rules/design-system.mdc` | Lumora + Tahoe tokens, shiny chips, brand pills, partner pills |
| `.cursor/rules/content-source.mdc` | `portfolio.json`, sections, brands, partners |
| `CLAUDE.md` | Repo entry point; points to skill + `.agents/skills/` |

## `.gitignore` change
- **Before:** entire `.cursor/` ignored → rules/skills never committed.
- **After:** track `.cursor/rules/` + `.cursor/skills/portfolio/`; ignore `.cursor/debug-*.log`, `.cursor/hooks.json`,
  `.cursor/skills/impeccable/` (vendor duplicate of `.agents/skills/impeccable`).

## Hero partners — current (reverted)
- **Class:** `.partner-pill` — inline-flex frosted pill: logo + visible company name (Lumora “Trusted by” style).
- **Not in use:** `.partner-tile` (icon-only + tooltip), neutral/splash/Tahoe backdrop-filter chip layers — tried and
  rejected (poor contrast / “horrible” UX feedback).
- **Markup:** `public/index.html` — `<span class="partner-pill"><img>…<span x-text="p.name"></span></span>`.
- **Data:** `_partnersFromExperience()` in `data.js` (recency-sorted; brand colours in map unused by pill CSS).

## Chips & brand pills — canonical pattern (unchanged)
- **Shiny tinted:** `.icon-chip`, `.service-row__icon`, `.exp-row__icon`, `.point-chip` — gradient + `--tint` rim +
  inset highlight + diagonal `::before` gloss. **No** backdrop-filter-only neutral “liquid glass” fill on these.
- **Brand pills:** `.brand-pill` — gradient surface, brand mono badge, sheen sweep, `.spec` glow; stack/AI via
  `--stack` / `--ai` pill-top tokens.

## Docs superseded
- `14-partner-tiles-beam-splash-blur.md` — partner **tiles** + per-org `--tint` rings: **superseded** by this doc for
  partner UI; loader blur-reveal + View experience `beam` items remain valid.
- Liquid-glass chip experiments (conversation Jul 2026): **not shipped** — do not re-apply without explicit request.

## Verify
- Hard refresh: hero “Worked with” shows named frosted pills, not icon-only circles.
- Service/exp icons still use shiny tinted chips; stack pills use brand-pill gradient + coloured mono badges.
- `git status` shows `.cursor/rules/` and `.cursor/skills/portfolio/` as trackable (not ignored).
