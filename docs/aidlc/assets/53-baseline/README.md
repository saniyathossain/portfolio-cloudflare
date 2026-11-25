# 53 — Baseline (pre-port, Alpine build)

Captured 2026-11-24 on branch `feat/astro-port` (from `develop` @ 4aa1510 + uncommitted docs), served by
`wrangler dev` (local), headless Google Chrome via puppeteer-core.

## Screenshots — `shots/`
69 PNGs. Per width **360 / 768 / 1024 / 1440**:
- `<w>-full.png` — full page after a scroll-through (reveals triggered).
- `<w>-sec-NN-<id>.png` — each section/footer scrolled to top of viewport.
- `<w>-state-*.png` — menu, modal, herocard-next, accordion-open, editorial-tab2, editorial-search; `skills-expanded` where the toggle is visible (mobile).
- Zero console errors / step errors during capture.

**Not committed** (`shots/` and `lighthouse/` are gitignored — 39 MB, regenerable). Re-capture with
`scripts/baseline-capture.ts` (puppeteer-core borrowed from the global `lighthouse` install):

```bash
BASE=http://127.0.0.1:8787/ OUT=$PWD/docs/aidlc/assets/53-baseline/shots node scripts/baseline-capture.ts
```

Baseline = capture from `develop`@4aa1510 (`git worktree`/checkout) before comparing a port phase. The Lighthouse
numbers below are the durable record.
The clock/"Present" tenure/date text changes with time, so ignore those regions when diffing.

## Lighthouse — `lighthouse/` (local, Lighthouse 13.0.3, default throttling)

| Form | Perf | A11y | BP | SEO | LCP | TBT | CLS | Requests |
|------|------|------|----|-----|-----|-----|-----|----------|
| mobile | 58 | 100 | 100 | 100 | 3.5 s | 1780 ms | 0.003 | 32 |
| desktop | 83 | 100 | 100 | 100 | 1.3 s | 260 ms | 0.048 | 35 |

Local numbers are lower than the live doc-50 run (mobile 69 / desktop 92) — different machine/network/cache
headers. Compare **post-port local runs against these**, not against live. Bottleneck is TBT (Alpine init).
