# AIDLC — Portfolio Rebuild Overview

This project rebuilds Saniyat Hossain's portfolio using the **Lumora** design template filled with **portfolio-v2**
content, deployed on **Cloudflare Workers** at **https://saniyat.com**.

## Stack
- Static HTML (`public/index.html`)
- CSS: `styles.css` + precompiled `tailwind.css`
- JS: Alpine.js, Motion (vendored), vanilla modules (`loader.js`, `boot.js`, `data.js`, …)
- No npm/node_modules at runtime

## Key paths
| Path | Role |
|------|------|
| `public/` | Deployable static site |
| `public/assets/data/portfolio.json` | Content JSON (fetched at runtime) |
| `public/assets/js/data.js` | Loader, transforms, `portfolioDataReady` |
| `src/index.js` | Worker security headers + CSP |
| `wrangler.toml` | Cloudflare config |
| `.cursor/skills/portfolio/SKILL.md` | Agent project skill |
| `.cursor/rules/` | Architecture, design-system, content-source rules |
| `docs/aidlc/` | Design history & rationale (00–53) |
| `legacy/` | Old dc-runtime site (archived) |

## Doc index (recent)
| Doc | Topic |
|-----|--------|
| 11 | Loader restore, watermark, subtitles, point chips |
| 12 | Hero eyebrow + partner strip (evolved → doc 15) |
| 14 | Partner tiles experiment, loader blur, beam CTA |
| **15** | **Agent context, gitignore, partner-pill revert** |
| **17** | **Aurora canvas + CSS fallback, layered parallax, Lumora hover-fill** (Lenis explored then removed — wheel-freeze; native scroll) |
| **18** | **Signature uplift: whisper aurora + sun-glare, faux-frost sweep, awe-motion, PageSpeed 100** |
| 24 | CV/data reconciliation, dependency + code-quality pass |
| 39 | Feature flags, maintenance mode, opt-in analytics |
| 43 | PageSpeed at the Cloudflare edge (`run_worker_first`, Early Hints, cache headers) |
| 48 | Code conventions: template literals, early returns, no nested loops |
| 50 | PageSpeed both ends, responsive, motion polish (plan; Alpine-specific parts superseded by 52 if migration proceeds) |
| **51** | **CV v9 sync, stack-focused copy (no years/figures), icon-only pills, local dev on :8787** |
| **52** | **Stack direction: package.json + TS now → Astro + React islands + shadcn (plan, free-tier fit)** |
| **53** | **Astro + TS + React islands port plan: exact parity, GA section tracking, sections registry, JSON vs SQLite verdict** |
| **54** | **Engineering standards: strict TS, DTOs/enums, Laravel-style structure, DRY/SOLID, security, 5W logging, lint, PWA/compat** |

## Conventions for new docs
- File name `NN-kebab-title.md`, H1 `# NN — Title`; next number = **55**. (20 and 21 are each used twice and 44 is
  unused — historical, leave as is; don't reuse numbers.)
- Sections: **Context** (why, what was measured) → **Decisions/Changes** (tables welcome) → **Verification** →
  open questions. Plans say so in the title (`…-plan.md`) and record status.
- **Hard rule (doc 48 rule 4):** no AI co-author trailer in commits/PRs; agents never commit without the owner's
  go-ahead and never push/merge/deploy unasked.
- Never fabricate CV content; cite file paths (`file:line`) for code claims.
