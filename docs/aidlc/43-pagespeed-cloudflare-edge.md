# Plan 43 — PageSpeed / Cloudflare edge + mobile-TBT (UX-preserving)

## Execution status (as shipped, uncommitted)

| # | Item | Outcome |
|---|---|---|
| 1 | `run_worker_first = true` | **Done** — `wrangler.toml` |
| 2 | Unify asset-version hash | **Done** — `sync-head.js` now reads `ASSET_V` from `boot.js` instead of recomputing; verified single hash (`99b1e17a5092`) across `index.html`, `boot.js`, `src/index.js` post-build |
| 3 | `_headers` CSP/COOP/CORP fallback | **Done** — `public/_headers` |
| 4 | Dashboard toggles (Early Hints, Tiered Cache) | **User action required** — no dashboard/API access from this session |
| 5 | Icon pre-bake | **Skipped, documented** — would require destructively rewriting `public/index.html` outside the `SYNC:*` marker discipline the rest of the build relies on; measured runtime cost (pure string-concat, no DOM work) is small next to Alpine's own init. Architectural-risk/reward didn't clear the bar. |
| 6 | Parallax rect caching | **Done** — `motion.js`: `collectParallax()`/`applyElementParallax()` now cache `{docTop, height, speed}` once (load/resize) instead of calling `getBoundingClientRect()` per element per scroll frame |
| 6b | Dead `data-parallax` on `.hero-partners` | **N/A** — not present in current `index.html`; already resolved or the original finding was stale |
| 7 | Header paint containment | **Verified, no change** — blur radius already identical & untransitioned in both states; tried `contain: paint` on `.site-header` but reverted — it would clip `.brand-tooltip` (renders below the header's own box) on hover, a real UX regression. `.glass-pill`'s existing `transform: translateZ(0)` already provides GPU-layer isolation. |
| 8 | `content-visibility: auto` below-fold | **Skipped, documented** — needs real on-device height measurement per section to set safe `contain-intrinsic-size` (wrong value = CLS regression), and interacts with the IntersectionObserver-based reveal system in ways that want verification before shipping |
| 9 | Offscreen decor pause | **Verified, no change** — `pauseOffscreenDecor()` already wired at `motion.js:470`, generic `.beam, .create-band--flow` selector already covers all 9 beam elements, matching `.is-paused` CSS already present |
| 10 | Aurora rAF re-arm | **Verified + doc fix** — the rAF→setTimeout chain was already optimal (not a 60fps poll); fixed a stale header comment (said "~30fps", `FRAME_MS=42` is ~24fps) |
| 11 | Hero-card entrance transition | **Verified, no change** — `opacity`/`transform` were already in the `transition` list alongside `clip-path`/`padding-right`/`background`/`box-shadow` |

**Build:** `bash build.sh` clean (only the 2 pre-existing expected containment warnings); `preflight-check.js` OK. **Not committed** — awaiting explicit permission, per standing instruction. Deploy (and therefore real header/Early-Hints verification) remains blocked on Cloudflare auth.

---

## Context

**Why:** The user asked me to analyze two live PageSpeed reports for `https://saniyat.com` (desktop + mobile),
address the issues, and — crucially — **validate free Cloudflare/Wrangler settings that could drastically improve
PageSpeed without dropping UX or removing animations**. The PSI API is rate-limited (shared anonymous quota, HTTP
429) and CrUX has **no field data** for this low-traffic domain, so instead of a score I diagnosed the **live HTTP
headers + the code directly** — which surfaced a confirmed, high-impact production issue plus several free levers.

**The headline diagnosis (confirmed live via `curl -I https://saniyat.com/`):**
The Cloudflare Worker is **being bypassed in production**. `wrangler.toml`'s `[assets]` binding has no
`run_worker_first`, so Cloudflare Static Assets serves `public/` directly and `src/index.js` never runs for
HTML/asset requests. Evidence:
- **No `Content-Security-Policy`** header, no COOP/CORP; the live `permissions-policy` is the *short* `public/_headers`
  value (`camera=(), microphone=(), geolocation=()`), not the Worker's 5-item set → **security regression** (CLAUDE.md
  "keep CSP intact" is violated in prod today).
- **No `Link:` header, no `103`** interim (curl shows only `HTTP/2 200`) → the Worker's Early-Hints preload of the
  hero image / CSS / font **never fires** → a free mobile-LCP head-start is unused.
- **Doubled/conflicting `Cache-Control`** from `_headers` glob overlap — `portfolio.json` is served
  `...immutable, ..., max-age=3600` (both `/assets/*` and `/assets/data/*` rules concatenate) → it can pin a **year
  stale**. The font shows a duplicated `immutable, immutable`. This doubling is itself the signature of `_headers`
  (multi-glob append) winning over the Worker's single `.set()`.
- Homepage **maintenance-mode gating also silently doesn't work** (Worker never sees `/`).

**Already healthy (verified live — do NOT touch):** Brotli on (HTML/CSS/JS all `content-encoding: br`); HTTP/3 on
(`alt-svc: h3=":443"`); immutable 1yr caching on hashed assets with `cf-cache-status: HIT`; ETag present; LCP hero
`<h1>` paints at first paint (`opacity:1` both states, static build-time text — deliberately engineered, see
`styles.css:1757-1767`); zero web-font/third-party requests on load (one first-party Inter woff2, `font-display:
optional` + metric-matched fallback); every animation `prefers-reduced-motion`-gated.

**Intended outcome:** restore the Worker so CSP + Early Hints + clean caching + maintenance work again (mostly a
one-line config change activating ~300 lines of already-written, currently-dead header logic), fix the build's
divergent asset-version hashes, flip the free dashboard toggles, and layer in UX-neutral mobile-TBT/scroll code
optimizations — **replacing every "remove the effect" idea with an alternate that keeps the effect**.

**Guiding principle (user's explicit constraint):** never omit an animation or drop UX to gain score. Each code
item below is an *alternate*: cache rects instead of removing parallax; paint-containment instead of lowering the
(deliberately frosted) header blur; pause off-screen instead of deleting infinite decor; pre-bake icons instead of
dropping them; `content-visibility` instead of hiding content.

**Baseline / constraints:** branch `develop`. There is a **stack of uncommitted + unpushed work** (hero-card,
nav-lens, menu-buttons, navbar/clock/My-work styling) and pending **plan-42** (button redesign steps 1-3 are
*separate* and out of scope here; only its perf steps 4-7 are folded in). Deployment is **blocked on Cloudflare
auth** — a single deploy later ships this whole stack. **Localhost cannot validate this plan** (it bypasses the CF
Worker, Brotli, Early Hints, HTTP/3) — real verification is post-deploy `curl -I` + PSI in incognito. Non-negotiables
remain: `critical.css` mirrors `styles.css` for shared rules; `<head>` only via `scripts/sync-head.js` markers; no
inline `style=""`; light-only; reduced-motion gating; commit only with explicit permission, staged by name (never
`.impeccable/`). Decisions taken this session: **full combined scope**; **`run_worker_first = true`**.

---

## Tier 1 — Cloudflare / edge / build (highest certainty, zero UX risk)

### 1. Reactivate the Worker — `wrangler.toml`
Add under `[assets]` (`wrangler.toml:6-8`):
```toml
run_worker_first = true
```
Confirmed via CF docs: `true` = the Worker script runs unconditionally for all requests; the existing
`env.ASSETS.fetch(request)` path (`src/index.js:342`) then serves the asset and the already-written header logic
(`src/index.js:344-361`) applies. This single line restores, for **every** response: full `SECURITY_HEADERS`
incl. **CSP + COOP + CORP** (`src/index.js:34-45`), the **Early-Hints `Link`** on HTML (`:47-52,359-361`), a **single
clean `Cache-Control`** per asset type via `.set()` (`:347-354`) — which auto-fixes the doubled/conflicting values and
the `portfolio.json` `immutable` bug — and **maintenance-mode gating** (`:330-333`). Per-request edge cost is
negligible on the free tier (well under 100k req/day; assets remain browser-immutable-cached after first load).

### 2. Unify the asset-version hash (prerequisite for #1's Early-Hints benefit) — `scripts/`
The build stamps **two divergent `?v=` hashes** (proven live: `index.html` = `1aabce379845` vs `boot.min.js` =
`eb5e90733343`), because `scripts/set-asset-version.js:23` and `scripts/sync-head.js:14` use **different file-exclusion
sets** *and* run at **different pipeline stages** (`build.sh:10` before minify vs `:12` after). Harmless only while the
Worker is off; the moment #1 lands, the Worker's `EARLY_HINTS` (`src/index.js:49-50`) would preload
`styles.min.css?v=<hashA>` while the page requests `?v=<hashB>` → wasted preload + Lighthouse "preloaded but not used".
**Fix:** compute the version **once** over the final shipped files (after minify) with one exclusion set, and have all
consumers read that single value — `index.html`/head (`sync-head.js`), `boot.js` (`set-asset-version.js`), and the
Worker `EARLY_HINTS` string. Simplest mechanism: run the stamp after `minify-js` and have `sync-head.js` **read**
`ASSET_V` from `boot.js` rather than recomputing. Post-build invariant to verify: `grep -roh '?v=[a-f0-9]\{12\}'`
across `public/index.html`, `public/assets/js/boot.min.js`, `src/index.js` yields **one** value.

### 3. Complete the `_headers` security fallback — `public/_headers`
So a future bypass can never again silently drop CSP: mirror the Worker's `Content-Security-Policy`,
`Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, and the full 5-item `Permissions-Policy` into the `/*`
block (`public/_headers:1-6`). With `run_worker_first = true` the Worker overrides these on served responses; this is
pure defense-in-depth. (Leave the cache rules; the Worker now normalizes them.)

### 4. Free dashboard toggles — **USER ACTION** (I have no dashboard/API access; not settable in `wrangler.toml`)
Cloudflare zone for `saniyat.com`:
- **Early Hints → ON** (Speed → Optimization → Content Optimization). *Required* for the Worker's `Link` header (#1)
  to be upgraded to a real `103`. Without this, #1 restores the header but no 103 is sent.
- **Smart Tiered Cache → ON** (Caching → Tiered Cache). Free; raises edge hit-ratio — the hero LCP image came back
  `cf-cache-status: MISS`, so cold-edge users pay origin latency on the LCP element.
- **HTTP/3 (+ 0-RTT) → confirm ON** (already on per `alt-svc`; 0-RTT under Network).
- **Brotli → confirm ON** (already active; toggle may be auto now).
- **Rocket Loader → OFF** (would defer/reorder Alpine's inline `x-data` → breaks the app), **Auto-Minify** N/A
  (retired; output already minified), **Polish/Mirage** skip (Pro-only; images already WebP+responsive).

---

## Tier 2 — Mobile TBT / scroll (code; UX-neutral alternates)

### 5. Cut runtime icon work during Alpine's boot walk — `scripts/` + `public/index.html` + `icons.js`
Alpine init over the whole `#app` (`index.html:88`) is the largest boot long-task; it includes **51 synchronous
`iconSvg()` SVG-string builds** from `x-html="iconSvg(...)"`. **Alternate (keep every icon):** add a build-time
pre-bake pass (sync-head-style, between markers) that inlines the literal SVG for **static-name** icon usages
(nav, section headers, hero, service rows), leaving **data-driven** ones (inside `x-for`, name from data) as runtime
`iconSvg`. **Measure first:** count static vs `x-for` usages — the win scales with the static share. If most are
dynamic, fall back to the smaller win of trimming `icons.min.js` (24.8 KB, `defer`) to only the runtime-needed set.
No visual change (identical SVGs).

### 6. Kill per-frame forced reflow in parallax — `public/assets/js/motion.js`
`applyElementParallax` (`motion.js:149-165`) calls `getBoundingClientRect()` **per `[data-parallax]` element per
scroll frame** (`:154`). **Alternate (keep parallax):** cache each element's offset/height once, refresh on a
`ResizeObserver` + `heroInView` change, and drive the transform from cached values + `scrollY` (no per-frame layout
read). Also remove the **dead** `data-parallax="0.05"` on `.hero-partners` in `index.html` (its transform is overridden
by the reveal system, so it does nothing but cost a rect read each frame — plan-42 step 6).

### 7. Header liquid-glass: contain the cost, keep the frost — `styles.css` + `critical.css`
The user's recent work deliberately raised the header backdrop blur (≈50px) for the Tahoe look — **do not lower it**
(supersedes plan-42 step 4's "reduce blur"). Instead: (a) verify the `backdrop-filter` **radius is identical** in
`.glass-pill` and `.glass-pill.is-scrolled` and **not in any `transition` list** (animating blur radius = per-frame
re-blur; the scroll-cross must ride only `background`/`box-shadow`); (b) add paint isolation to the header
(`contain: paint` / `isolation: isolate`) so the frosted layer doesn't re-cost a full-page repaint each scroll frame.
Mirror any above-the-fold change into `critical.css` (byte-match rule).

### 8. Skip offscreen rendering — `styles.css` (+ `critical.css` if above-fold)
Add `content-visibility: auto` + a matched `contain-intrinsic-size` to long **below-the-fold** sections
(experience/education/etc.). UX-neutral (identical once scrolled into view), cuts initial layout/paint main-thread
work → lower TBT. **Caveat:** set `contain-intrinsic-size` from measured heights to avoid scrollbar/CLS surprises, and
exclude any section that is an in-page anchor target above the fold. Ship behind a quick CDP CLS re-check.

---

## Tier 3 — Fold in plan-42 perf steps (UX-preserving)

### 9. Pause infinite decor off-screen — `motion.js` (+ CSS)
Verify `pauseOffscreenDecor` (`motion.js:385-396`) covers **all 7** conic `.beam` borders + `create-band--flow` +
aurora, toggling `.is-paused { animation-play-state: paused }` via IntersectionObserver. Extend to any decor it
misses. (Alternate to deleting the always-painting borders — keeps them, stops the mid-scroll paint.)

### 10. Aurora rAF re-arm — `aurora.js`
Confirm the loop re-arms **only when it actually draws** (currently rAF→`setTimeout(FRAME_MS≈42)` paced ~24fps, paused
on `visibilitychange`/`blur` — already reasonable; `aurora.js:76-102`). Tighten only if it wakes the main thread on
skipped frames. Fix the doc/const mismatch (comment says ~30fps, code is 42ms).

### 11. Hero-card entrance snap — `styles.css` (+ `critical.css`)
Add `opacity` + `transform` (with `--dur-reveal`/`--ease-reveal`) to the `transition` list of
`.hero__aside .hero-card[data-reveal]` (~`styles.css:1746-1749`) so the desktop entrance eases instead of snapping;
keep `clip-path`/`padding-right`/`box-shadow`. Verify the hover clip-path drawer still animates.

---

## Critical files
- **Config/edge:** `wrangler.toml` (run_worker_first) · `public/_headers` (CSP fallback) · `src/index.js`
  (EARLY_HINTS `?v=` restamped by build; header logic verified, not rewritten).
- **Build:** `scripts/set-asset-version.js` + `scripts/sync-head.js` (unify hash) · `build.sh` (ordering) ·
  new icon pre-bake script · `scripts/hash-sw.js` (auto).
- **Code:** `public/assets/js/motion.js` (parallax rect cache, offscreen pause) · `public/assets/js/aurora.js` ·
  `public/index.html` (dead parallax removal, icon markers) · `public/assets/js/icons.js`.
- **CSS:** `public/assets/css/styles.css` + `public/assets/css/critical.css` (header containment,
  content-visibility, hero-card entrance — keep the two byte-matched for shared rules).
- **Auto-regenerated mirrors:** `*.min.css`, `*.min.js`, `boot.js`/head/`EARLY_HINTS` version stamps, `public/sw.js`.
- **Docs:** new `docs/aidlc/43-pagespeed-cloudflare-edge.md` (copy of this plan + the live-header evidence).

## Verification
- **Build:** `bash build.sh` → `node scripts/preflight-check.js` (only the 2 expected containment warnings). Assert
  the **single-hash invariant** from step 2 via grep. Confirm `critical.css`↔`styles.css` mirror holds.
- **Local (CDP, code changes only — cannot test the CF/edge path):** icons still render everywhere (if pre-baked);
  scroll paint-flashing before/after step 6-9; **CLS still 0** after step 8; reduced-motion pass; header frost
  unchanged visually after step 7.
- **Post-deploy (real acceptance — needs the blocked Cloudflare auth):**
  `curl -sSI https://saniyat.com/` must now show `content-security-policy`, `cross-origin-opener-policy`, a **single**
  `cache-control`, and (with dashboard Early Hints on) `curl -sv` shows a `103` interim carrying the `link:` preloads;
  `portfolio.json` returns a lone `max-age=3600`. Then **PSI in incognito** both form factors (localhost/non-incognito
  is unreliable — active SW + no Worker). Compare LCP/TBT to the current reports.

## Commit grouping (only on explicit permission; stage by name; never `.impeccable/`)
- `docs:` `docs/aidlc/43-*.md`.
- `fix(edge):` `wrangler.toml` run_worker_first + `_headers` CSP fallback + asset-version unification
  (`set-asset-version.js`, `sync-head.js`, `build.sh`, restamped `boot.js`/`src/index.js`/`sw.js`).
- `perf(mobile):` icon pre-bake (`icons.js`, `index.html`, build script), parallax rect cache + dead-parallax
  (`motion.js`, `index.html`), header containment + content-visibility + hero-card entrance
  (`styles.css`, `critical.css`), offscreen-pause/aurora (`motion.js`, `aurora.js`), + minified mirrors.
- Keep built/minified artifacts in the same commit as their source. Note this stacks on the existing uncommitted work.
