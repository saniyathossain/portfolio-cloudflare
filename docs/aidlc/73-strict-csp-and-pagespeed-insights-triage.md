# 73 — Strict hash-based CSP and the PageSpeed Insights triage

## Context
Owner asked that every item in the PageSpeed Insights details be checked and fixed. Reading all 278 audits per device (226 pass,
22 manual) left these non-passing items: forced reflow, network dependency tree, main-thread work, unused CSS, long tasks,
non-composited animations, DOM size, CLS culprit (desktop 0.010), CSP effectiveness, Trusted Types, Baseline features, JS
libraries, and three Cloudflare-beacon items (cache lifetime, legacy JS, 3rd parties).

## Triage
| Item | Outcome |
|---|---|
| Network dependency tree | Fixed in doc 72 (modulepreload). |
| CSP "not effective against XSS" | **Fixed** (below). |
| Forced reflow | Removed the avoidable sources: `BackToTop` (IntersectionObserver marker, no scroll listener, no `scrollY` read) and the scroll-progress first read (next frame). The rest is the one large layout of a 1,556-node DOM that would happen later anyway; only a smaller DOM reduces it. |
| Main-thread / long tasks / TBT | Local Lighthouse (static server, same machine): TBT 170 ms → 40–60 ms after docs 72 + 73; Worker runs 20–30 ms. Remaining cost is style/layout of the large DOM (`content-visibility` is already applied). |
| Desktop CLS 0.010 on `.shell.hero__grid` | Does not reproduce locally (0 on every run, strict and permissive CSP alike). One local 0.04 was a cold-start flake. Use RUM (`RUM_SAMPLE_RATE`, doc 69) for per-section attribution. |
| Trusted Types | Not adopted: satisfying `require-trusted-types-for` for the `dangerouslySetInnerHTML` / `innerHTML` sinks needs a policy; a pass-through default policy would be security theatre. Needs an audit of those call sites first. |
| Non-composited animations, DOM size, unused CSS (17 KiB), Baseline, JS libraries | Informational; design-level (brand-pill `grid-template-columns`, `text-shadow`, gradients). Not changed. |
| Cloudflare beacon items | Owner action: disable automatic Web Analytics in the dashboard, then set `CSP_ALLOW_CLOUDFLARE_BEACON=off`. |

## Strict CSP
- `scripts/csp-manifest.ts` (chained after `astro build` + `modulepreload` in `npm run build`) writes `dist/_csp.json`: the SHA-256 of every
  executable inline `<script>` (and any inline event-handler attribute) in `dist/**/*.html`, plus script hosts the configured features need
  (Turnstile only when a site key is set, Google tag only when a GA id is set).
- `StaticSiteResponder` fetches the manifest once per isolate from the ASSETS binding (`src/worker/security/cspManifest.ts`; failures are not
  cached) and sets `script-src 'self' <hashes> 'unsafe-inline' [hosts]` on built HTML. `'unsafe-inline'` after hashes is ignored by every
  browser that understands hashes and exists only as the CSP1 fallback Lighthouse recommends. If the manifest cannot be read the previous
  policy stays, so a bad deploy cannot blank the site. `/_csp.json` answers 404 to visitors.
- The stylesheet preload no longer uses `onload`/`onerror` attributes (they would need `'unsafe-hashes'`): `scripts/sync-head.ts` emits one
  inline script that attaches the listeners and checks the resource timing entry in case the preload already finished.
- Other directives are unchanged (`style-src` keeps `'unsafe-inline'`: the critical `<style>` and runtime CSSOM writes).
- `CSP_ALLOW_CLOUDFLARE_BEACON` (Worker var, default on) keeps `static.cloudflareinsights.com` in `script-src` while Cloudflare injects its
  beacon, so that is not reported as a violation; set `off` once the beacon is disabled.

## Verification
tsc, eslint, vitest (154) clean. `wrangler dev`: page loads under the strict header with no CSP violations; stylesheet swaps in
(`css-pending` clears), loader finishes, 7 of 8 islands hydrate (Editorial waits for scroll); back-to-top toggles on scroll;
`fouc-check` and `behavior-check` pass; `/_csp.json` → 404. Lighthouse (local): performance 100, best practices 100, no console errors.
Remaining local CSP finding: host allowlist for the Cloudflare beacon (see above).

## Not verified
Production behaviour of the manifest fetch on Cloudflare (verified only with `wrangler dev`); re-run PageSpeed after deploying.
