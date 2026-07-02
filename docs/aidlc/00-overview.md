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
| `docs/aidlc/` | Design history & rationale (00–15) |
| `legacy/` | Old dc-runtime site (archived) |

## Doc index (recent)
| Doc | Topic |
|-----|--------|
| 11 | Loader restore, watermark, subtitles, point chips |
| 12 | Hero eyebrow + partner strip (evolved → doc 15) |
| 14 | Partner tiles experiment, loader blur, beam CTA |
| **15** | **Agent context, gitignore, partner-pill revert** |
