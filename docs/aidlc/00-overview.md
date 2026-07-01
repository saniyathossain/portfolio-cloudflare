# AIDLC — Portfolio Rebuild Overview

This project rebuilds Saniyat Hossain's portfolio using the **Lumora** design template filled with **portfolio-v2** content, deployed on **Cloudflare Workers** at **https://saniyat.com**.

## Stack
- Static HTML (`public/index.html`)
- CSS: `styles.css` + precompiled `tailwind.css`
- JS: Alpine.js, Motion (vendored), vanilla modules
- No npm/node_modules at runtime

## Key paths
| Path | Role |
|------|------|
| `public/` | Deployable static site |
| `public/assets/js/data.js` | Content source of truth |
| `src/index.js` | Worker security headers |
| `wrangler.toml` | Cloudflare config |
| `legacy/` | Old dc-runtime site (archived) |
