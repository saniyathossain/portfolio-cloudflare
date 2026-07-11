# 39 — Feature flags, maintenance mode & opt-in analytics

## Context
Capabilities to gate sections, flip layouts, and measure traffic without code changes each time:
1. **JSON feature flags** — local defaults (`site.features.flags`, `site.features.underConstruction`).
2. **Worker feature flags** — edge toggles in `wrangler.toml [vars]` or Dashboard → Variables (same block as `MAINTENANCE_MODE`).
3. **Opt-in analytics** — zero requests until configured.

## Worker feature flags (`wrangler.toml` → `[vars]`)

Grouped in `wrangler.toml` under `# ── Feature flags (Worker vars) ──`, next to `MAINTENANCE_MODE`.

| Var | Default | Effect |
|-----|---------|--------|
| `MAINTENANCE_MODE` | `"off"` | Site-wide **503** hard gate. Truthy → everyone sees maintenance page; `?preview=<ADMIN_TOKEN>` bypasses. |
| `SKILLS_SCROLL_DESIGN` | *(omit)* | **Optional** override for Tools & craft scroll layout. Truthy → on; `"off"` → off; **omit** → `portfolio.json` `site.features.flags.skillsScrollDesign.enabled`. |

Truthy: `"1"` / `"true"` / `"on"`. Falsy: `"off"` / `"false"` / `"0"`.

### Maintenance mode (hard gate)

Implemented in `src/index.js` (`maintenanceOn` / `maintenanceResponse`), evaluated **first** in `fetch`:
- Template: `src/maintenance.html` → self-contained **503** (`Retry-After: 3600`, `noindex`).
- Copy: `MAINTENANCE_TITLE`, `MAINTENANCE_MESSAGE` (optional Worker vars).
- Bypass: `?preview=<ADMIN_TOKEN>`.

Why Worker-level: must gate before assets/JS load and return a real 503 — a client overlay cannot.

### Skills scroll layout (soft layout swap)

When enabled, Tools & craft uses the Skiper31-style scroll pill cloud ([reference](https://skiper-ui.com/v1/skiper31)) — same `.brand-pill`, no category boxes. `skills-scroll.js` drives scroll transforms.

**Resolution order:** `SKILLS_SCROLL_DESIGN` Worker var (if set) → else JSON `enabled`. Worker + `data.js` normalize to a boolean on `site.features.flags.skillsScrollDesign` for Alpine.

## JSON feature flags (`portfolio.json` → `site.features`)

Sorted keys: **`flags`** (layout / experiment toggles) then **`underConstruction`** (soft section overlays).

### `flags` — local defaults (+ optional Worker override)

```json
"features": {
  "flags": {
    "skillsScrollDesign": {
      "enabled": false
    }
  },
  "underConstruction": { … }
}
```

Set `"enabled": true` for local preview (`npx wrangler dev`, static server). Production: leave `false` in repo; flip via Dashboard `SKILLS_SCROLL_DESIGN=on` if needed.

### `underConstruction` — soft per-section (client-only)

```json
"underConstruction": {
  "contactForm": {
    "enabled": true,
    "title": "This page is under construction",
    "message": "…",
    "mailLabel": "Email us"
  }
}
```

- `app.js` → **`uc(key)`** returns config or `{ enabled: false }`.
- Contact modal binds `uc('contactForm')`: frosts form, shows `.uc-panel` when on.

**Add a new UC flag:** key under `underConstruction`, bind `uc('<key>')` in markup.

## Opt-in analytics

Config in `portfolio.json → site.analytics`:
```json
"analytics": { "googleId": "", "cloudflareToken": "" }
```
- `sync-head.js` injects GA4 / CF beacon **only when non-empty**.
- CSP hosts allow-listed in `src/index.js` (allowed-but-unused by default).

## Verify
- `./build.sh` → no analytics tags while ids empty; set `googleId` → GA4 appears.
- `uc('contactForm').enabled` → modal blurs + panel; off → normal form.
- `MAINTENANCE_MODE=1` → 503 everywhere; `?preview=<ADMIN_TOKEN>` → live site.
- `site.features.flags.skillsScrollDesign.enabled: true` (no Worker var) → scroll layout locally.
- Dashboard `SKILLS_SCROLL_DESIGN=on` → scroll layout in production; `off` → default grid.
