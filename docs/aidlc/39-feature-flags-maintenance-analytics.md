# 39 — Feature flags, maintenance mode & opt-in analytics

## Context
Three related capabilities, added so the site can be gated and measured without code changes each time:
1. A **named, reusable "under construction" flag** (the first one was hard-coded to the contact form and
   un-scoped — impossible to reuse for another section tomorrow).
2. A **site-wide maintenance mode** (a hard gate, not a soft overlay).
3. **Opt-in analytics** (Google Analytics 4 + Cloudflare Web Analytics) that stays request-free until configured,
   so the default build keeps the "no new network requests" guarantee.

## 1. Named "under construction" flags (soft, per-section — client-side)

Config lives in `portfolio.json → site.features.underConstruction.<sectionKey>`:
```json
"features": {
  "underConstruction": {
    "contactForm": {
      "enabled": true,
      "title": "This page is under construction",
      "message": "…",
      "mailLabel": "Email us"
    }
  }
}
```
- Each instance is **named by section** (`contactForm`, and any future key), so it can gate any part of the site.
- `app.js` exposes a helper: **`uc(key)`** → returns the config object or `{ enabled:false }` if absent.
- The contact modal ([index.html](../../public/index.html)) binds to `uc('contactForm')`: when enabled it frosts the
  form (`.modal-form-wrap.is-uc .modal-form { filter: blur(5px) }`), makes it `inert`, and floats a glass
  `.uc-panel` (wrench icon-chip + title + message + **Email us** CTA — label first, trailing circular
  `.pill-btn__icon` badge so the `.pill-btn-dark` asymmetric padding lands correctly). Off → panel not rendered,
  form works normally.

**Add a new one:** add a key under `underConstruction`, then in the target section bind to `uc('<key>')`.

## 2. Maintenance mode (hard, site-wide — Worker-level)

Toggled by the **`MAINTENANCE_MODE`** var (`"1"/"true"/"on"`), in `wrangler.toml` or Dashboard → Worker → Settings
→ Variables. Implemented in `src/index.js` (`maintenanceOn` / `maintenanceResponse`), evaluated first in `fetch`:
- The page is a **real template file, `src/maintenance.html`** (not an inline string), bundled into the Worker as a
  **text module** (`[[rules]] type="Text"` in `wrangler.toml`) and rendered by substituting `{{TITLE}}` /
  `{{MESSAGE}}` / `{{EMAIL}}` (all escaped). Returns a **self-contained 503** (no asset deps, `Retry-After: 3600`,
  `noindex`), on-brand Tahoe glass + copper, with a `mailto:CONTACT_TO` CTA. Edit the `.html` to restyle it.
- Copy overridable via `MAINTENANCE_TITLE` / `MAINTENANCE_MESSAGE`.
- **Owner bypass:** `?preview=<ADMIN_TOKEN>` serves the real site while everyone else sees the 503.

Why Worker-level (not a portfolio.json flag like #1): maintenance must gate **before** any content/JS loads, return a
real 503, and work even if assets fail — a client-side overlay can't. #1 is a soft per-section notice; #2 is a hard
whole-site gate.

## 3. Opt-in analytics

Config in `portfolio.json → site.analytics`:
```json
"analytics": { "googleId": "", "cloudflareToken": "" }
```
- `sync-head.js → buildAnalytics()` injects the **GA4 gtag** snippet and/or the **Cloudflare Web Analytics beacon**
  into `<head>` **only when the id/token is non-empty** (ids sanitised to `[\w-]`). Empty → nothing injected → zero
  external requests, so the default build is unchanged.
- `src/index.js` CSP allow-lists the analytics hosts (`googletagmanager.com`, `static.cloudflareinsights.com` in
  `script-src`; `google-analytics.com`, `region1.google-analytics.com`, `cloudflareinsights.com` in `connect-src`).
  These are **allowed-but-unused** until an id is set.
- **Zero-config alternative:** Cloudflare **Web Analytics** (Dashboard → zone → Analytics → Web Analytics → automatic)
  and **Workers** request analytics need no code at all — recommended as the always-on baseline.

### Constraint note
The "no new network requests" non-negotiable holds **for the default build** (all analytics fields empty). Filling an
analytics id is a deliberate, documented opt-in that trades one third-party request for measurement; PageSpeed impact
is minimal (GA4 `async`, CF beacon `defer`).

## Verify
- `./build.sh` → head contains **no** analytics tags while ids are empty; set `googleId` → GA4 tags appear.
- Toggle `uc('contactForm').enabled` → modal blurs + panel; off → normal form.
- `wrangler dev` with `MAINTENANCE_MODE=1` → every path returns the 503 page; `?preview=<ADMIN_TOKEN>` shows the site.
