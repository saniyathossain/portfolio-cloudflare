# Gaps vs Lumora Base Template

| Lumora feature | Status |
|----------------|--------|
| Lenis smooth scroll | Not included (native smooth-scroll); can add later |
| Liquid hero (before/after photos) | Reused as a single-portrait liquid grayscale→colour cursor reveal |
| Portfolio "Selected Work" (4 dark project cards) | **Replaced by the Experience timeline** — there is no `projects` data; a personal engineer's work is represented as the company/role experience section, which is richer (company groups → expandable roles → tenure popovers → stack/AI pills) |
| Services hover rows | Implemented (glass panel, hover-fill rows) |
| Live clock | Implemented |
| Per-role experience expand | Implemented (BS23 has 4 independent toggles) |
| ThemeForest i18n | Out of scope |
| Dark mode toggle | Out of scope (light-only, confirmed) |
| Real contact form backend | Stubbed modal submit |
| Devicon stack icons | Real Simple Icons brand SVGs (local, brand-coloured) + monogram fallback |
| Magnetic CTAs / card tilt | Added via Motion One (`motion.js`) |
| Font | SF Pro / SF Mono system stack (macOS Tahoe-native, no web-font request) |

## Current section order (DOM)

PageLoader → Header → Hero → About → CreateBand → Services → **Experience** → Skills → Stats →
Education → Footer → NavMenu (overlay) → RequestModal (overlay).

> Note: earlier drafts of this doc referenced a "Portfolio 4 dark cards" section fed from
> `projects.json` and "Services between Portfolio and Experience". Neither exists — that content
> was intentionally consolidated into the **Experience** timeline. See
> `06-tahoe-refinement-plan.md` for the macOS Tahoe "Liquid Glass" refinement pass applied on top
> of this base.
