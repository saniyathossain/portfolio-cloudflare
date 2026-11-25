# 71 — Document compression regression and real CSS minification

## Context
PageSpeed (desktop + mobile, 2026-11-25) flagged on the live site: **Document request latency — no compression applied, est.
247 KiB**; **Network dependency tree** up to 3.6 s (16 `/_astro/*.js` island chunks); **Reduce unused CSS** (~49 KiB) and
**Minify CSS** (~9 KiB). Mobile scored 83 (FCP 2.7 s, LCP 2.7 s, TBT 250 ms, CLS 0, SI 5.6 s).

## Why they were not addressed
| Finding | Reason it was still there |
|---|---|
| No compression | **Caused by doc 68.** I added `Cache-Control: no-transform` to the HTML to stop Cloudflare's automatic Web Analytics beacon. Cloudflare also skips gzip/brotli for `no-transform` responses: `curl -H 'Accept-Encoding: br' https://saniyat.com/` returned 377,302 bytes for br, gzip and identity alike. My local checks used `scripts/serve-static.ts` (gzips everything), so the regression was invisible there. |
| Dependency tree | Mostly a symptom of the above: a 371 KiB uncompressed document plus ~36 KiB CSS on slow 4G delays every island chunk to ~3 s. Documented earlier as "chunk waterfall", not yet attacked. |
| Minify CSS | The in-repo minifier only collapsed whitespace and removed comments (kept `: ` and `; ` spacing, long numbers, redundant gradient stops). |
| Unused CSS | Informational (unscored). The bundle serves every section, modal and state from one stylesheet; the inline critical copy (tailwind + critical + brand tints, doc 68) is intentionally a superset of first paint. Compression makes both cheap; trimming rules needs a per-section split (not done). |

## Changes
- `no-transform` is **opt-in**: `BLOCK_EDGE_INJECTION=on` (was `ALLOW_EDGE_INJECTION`, default-on blocking). Default HTML responses are compressed by Cloudflare again.
  To stop the automatic Web Analytics beacon use the dashboard (Analytics & Logs → Web Analytics → disable automatic setup).
- `scripts/minify-css.ts` now uses esbuild's CSS minifier (`target: "esnext"`, no lowering): `styles.min.css` 197.7 → 177.0 KB,
  `critical.min.css` 71.1 → 65.1 KB. Verified equivalent: computed styles of all ~1,600 elements, old vs new stylesheet, differ
  only in `background-image` text where redundant gradient stops (`0%`, `100%`, evenly spaced) were dropped; `critical-parity-check`,
  `fouc-check`, `behavior-check` unchanged/pass.

## Verification after deploy (owner)
1. `curl -sI -H 'Accept-Encoding: br' https://saniyat.com/ | grep -i content-encoding` → `br`; `cache-control` has no `no-transform`.
2. Re-run PageSpeed (desktop + mobile); expect the document at ~50 KiB transfer and a shorter dependency tree.
3. If the chain is still flagged: add `modulepreload` for the island chunk graph (post-build step) or merge chunks via `manualChunks`.

## Still open
TBT ~250 ms (`loader.min.js`, `is-ready` restyle of ~1,555 elements), Speed Index 5.6 s mobile, non-composited animations, per-section CSS split.
