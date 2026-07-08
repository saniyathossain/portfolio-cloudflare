# Plan 41 (revision 2) — Ship the mobile-parity/perf work + verify PageSpeed correctly

## Context

Plan 41's implementation (mobile tap-reveal pills/popovers/orbs, education hover retune, touch motion tier, create-band "pipeline flow", 768 tablet tier, cross-browser hardening, justified experience text) plus this session's follow-up fixes (two real CLS bugs — `.hero min-height→height` and missing `.nav-overlay`/`.modal-backdrop` rules in critical CSS — the loader-timing trim, and the eyebrow-dot removal) are **all implemented in the working tree but NOT committed and NOT deployed**. Verified: `git status` shows 16 modified + 4 untracked files (incl. `critical.css`/`critical.min.css`); HEAD is still `d6ec136`; nothing ahead of origin. **The live site the user keeps testing is stale — it has none of this work.** That is the single biggest reason the user still sees "reveal stack not working," "popups only on tap," and "transitions not working in responsive": those fixes exist locally but were never shipped.

The user's latest report (a Lighthouse paste) contains two items that a live-browser + JSON audit this session proves are **measurement artifacts, not code defects**:

1. **A11y "Buttons must have discernible text" → `div.prod---modal > div.header > button.x`.** This element is **not in our source** (`grep` across `public/`+`src/` returns nothing; the naming matches no house convention). The report's own `runWarnings` says *"Chrome extensions negatively affected this page's load performance."* It is a **Chrome-extension-injected modal**. Every real button we ship has an accessible name (verified: `.nav-overlay__close` has literal "Close" text, `.modal-close` has `aria-label` from `site.contactModal.closeAriaLabel="Close"`, all icon-only buttons carry `aria-label`, all icons are `aria-hidden`). Our own a11y score is 100.

2. **Mobile Performance < 100 (FCP 2.1–2.2s, LCP 3.4–3.8s).** Two compounding causes, both environmental: (a) the same Chrome extensions degrade the run (the `runWarning`); (b) **localhost Lighthouse's network/CPU *simulation* massively inflates FCP/LCP for this app** — in clean headless runs the LCP element (hero eyebrow text) has `elementRenderDelay = 106ms` and TTFB ~2ms (i.e. it paints almost immediately), yet the simulated LCP is reported as 3.8s. A direct CDP real-render measurement under matching 4×CPU + Slow-4G throttling gave **LCP ≈ 1.9s**. CLS is now a stable **0** and TBT 90–180ms in clean runs. There is no remaining loader/critical-CSS lever — the loader does not gate the LCP paint (106ms render delay proves it), and further localhost micro-tuning only chases simulation noise.

**Conclusion:** the implementation is essentially complete and correct. What remains is to **ship it** and **measure it in the only environment that reflects "Google PageSpeed": the deployed Cloudflare site, in incognito, via PSI** — localhost python-http-server lab numbers are not trustworthy for this app.

Hard constraints (CLAUDE.md): light-only; every animation reduced-motion-gated; no new network requests; no inline `style=""`; `<head>` via `scripts/sync-head.js` only; **single build + single deploy** (free-plan build minutes); commits on `rc/v1.1` only, staged by name (never `git add -A`).

---

## Step 1 — Final local build + self-check (no new feature code expected)
- `bash build.sh`. Confirm: `critical.min.css` emitted + inlined by `sync-head.js`; `ASSET_V` restamped in `boot.js`/head/`EARLY_HINTS`; `sw.js CACHE_VERSION` rehashed. The 2 `minify-css` containment WARNINGs (`.nav-overlay`, `.hero h1 .line-inner`) are **expected** (deliberate minimal-subset rules, not literal duplicates) — not blockers.
- `git diff` review of `index.html`: only the `<!-- SYNC -->` blocks + the inline loader preset should differ.
- Quick reduced-motion + touch-emulation sanity pass already done this session (19/19 in `.cursor/work/ui41-verify.json`); re-confirm the eyebrow dot is gone (done — screenshot verified) and CLS=0 holds.

## Step 2 — Commit on `rc/v1.1`, staged by name
Group into reviewable commits (stage explicitly, never `-A`; do NOT stage `.impeccable/`):
- `docs: plan 41 …` → `docs/aidlc/41-*.md`
- `perf: critical CSS inline + async stylesheet swap + loader trim` → `loader.js`, `index.html`, `critical.css`, `critical.min.css`, `scripts/minify-css.js`, `scripts/sync-head.js`, `styles.css`(hero/eyebrow), `src/index.js`, built `*.min.*`, `sw.js`
- `fix(mobile): tap pill/popover/orb reveal + auto-hide, gate sticky hover` → `app.js`, `boot.js`, `motion.js`, `styles.css`
- `feat: education hover, touch motion tier, create-band pipeline-flow, 768 tablet tier, cross-browser, justified copy` (or split further) → `styles.css`, `index.html`, `motion.js`
- Keep built/minified artifacts in the same commit as their source. Confirm no secrets in the diff.

## Step 3 — Single deploy
`./deploy.sh` (runs `build.sh` again + `npx wrangler deploy`). This is the action that actually fixes the user's live experience. One deploy only (free plan).

## Step 4 — Verify in the correct environment (this is the real acceptance test)
- **PSI, both form factors, against `https://saniyat.com`, in incognito** (https://pagespeed.web.dev/analysis?url=https://saniyat.com). This — not localhost lab — is the number the user means by "Google PageSpeed." Record scores.
- **Real-phone / incognito on-device pass** of the exact complaints, now that the fixes are live: stagger/stack reveal on scroll; brand-pill tap→label reveal→auto-hide (other-tap / outside / scroll / 2.5s timer); popover + partner-orb tap-toggle with outside-tap+scroll dismissal; education-card + create-band transitions; eyebrow has no dot; experience copy justified.
- Re-run the a11y audit **in incognito** → the `prod---modal`/`button.x` failure disappears (extension gone), confirming our a11y is 100.

## Step 5 — Contingency ONLY if deployed-PSI mobile is genuinely < 100
The deployed trace (real Cloudflare TTFB + HTTP/2 + Brotli + Early Hints, not localhost) is the first trustworthy signal. If a real gap remains, read that PSI trace's actual opportunities before touching code. Most-likely honest levers, in order: (a) `font-display: optional`→`swap` behaviour check on the eyebrow LCP text; (b) whether the loader overlay's semi-opaque blur delays the *visually-complete* LCP on real hardware (consider revealing hero copy from the first frame under a lighter scrim); (c) Alpine init TBT staging (`x-ignore` + per-idle `Alpine.initTree`, already scoped in the prior revision). Do **not** pre-implement these — they were already at the point of diminishing returns on localhost, and may be unnecessary once measured on the CDN.

## What is explicitly NOT a task
- The `prod---modal`/`button.x` a11y failure — external Chrome extension; re-audit in incognito.
- Localhost Lighthouse FCP/LCP tuning — simulation artifact; measure the deployed site instead.

## Risky interactions watch-list (carried from rev 1)
- pillFlip vs pillTap on hybrids → complementary gates (`pointer:fine` vs `.touch-pills`), never both.
- critical.css byte-parity → the containment warning is the guard; hero/header/H1 must be pixel-identical pre/post async-swap.
- `--load-ms` coupling → `loader.js` constants and the `index.html` inline preset move together (both already at 650ms/10px).
- `[data-parallax]` transform clobbering → `var(--parallax-y)` folded into specific transform rules; never on tilt targets.
- `sync-head` regeneration → all head changes via `buildHead()`; diff `index.html` after every build.
- sw.js cache-first assets → **incognito for all post-deploy verification** or an active SW serves stale vendor/CSS.

## Addendum — same-session follow-up requests
Appended after this plan's approval, executed alongside Steps 1–4:
- Remove the `.skip-link` ("Skip to content") anchor from `index.html`. Note for the record: this is a WCAG 2.4.1 bypass-blocks best practice for keyboard/screen-reader users; removing it is a deliberate, explicit instruction, not an oversight.
- Audit HTML validity (tag balance, duplicate ids, missing `alt`, invalid `ul`/`ol` children, heading order, nested interactive elements) — a full static pass found **no structural defects**: doctype/lang present, all tags balanced, no duplicate ids, every `<img>` has `alt`, no nested `<a>`/`<button>`, no invalid list children, heading order is sane per section. `robots.txt`, `sitemap.xml`, and `manifest.webmanifest` are all present.
- Audit JSON-binding coverage: 94 existing `x-text`/`x-html` bindings to `portfolio.json` via `data.js`. The hero H1/eyebrow/rating text is intentionally **build-time**-bound (via `scripts/sync-head.js` reading the same `portfolio.json`) rather than runtime `x-text`, specifically to fix an LCP regression (client-side text replacement at Alpine boot was re-triggering LCP at ~3-4s under mobile throttle). This is still "dynamically bound to JSON" — just resolved at build time instead of runtime — and is the correct trade-off for both SEO (crawlers see real text with no JS) and PageSpeed. Reverting it to runtime `x-text` would regress the exact LCP fix this plan just landed, for no SEO gain (SSR already beats client hydration for crawlability). No hardcoded CV content found outside this intentional exception — the remaining hardcoded strings (`Close`, `Get in touch →`, `Local time —`) are UI chrome microcopy, not content data, and are conventionally left out of the content-JSON.
- "ThemeForest compliance" interpreted as: valid semantic HTML5, complete meta/SEO tags, accessible markup, cross-browser CSS — all verified already satisfied by the above audit plus the existing security-header/CSP/SEO work in `src/index.js` and `scripts/sync-head.js`.

## Critical files (already modified; this revision ships + verifies them)
`public/assets/css/styles.css` · `public/assets/css/critical.css` · `scripts/sync-head.js` · `scripts/minify-css.js` · `public/assets/js/loader.js` · `public/assets/js/motion.js` · `public/assets/js/app.js` · `public/assets/js/boot.js` · `public/index.html` · `src/index.js` · `docs/aidlc/41-mobile-parity-perf100-crossbrowser-plan.md`
