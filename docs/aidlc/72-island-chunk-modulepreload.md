# 72 — Island chunk chain: why it is late and what changed

## Context
After doc 71 the live site scored 96 mobile / 95 desktop, but PageSpeed's "Network dependency tree" still showed the 16 `/_astro/*.js`
island chunks finishing at ~1.6 s (mobile) and ~3.3 s (desktop), against ~0.25–0.5 s for the document.

## Finding
- All eight eager islands use `client:idle` (`HeaderClock`, `HeroCards`, `ExperienceAccordion`, `SkillsFlat`, `NavOverlay`, `ContactModal`,
  `BackToTop`) and Astro only fetches an island's component, renderer and shared chunks when `requestIdleCallback` fires.
- The main thread is busy with the loader overlay, the `is-ready` restyle (~1,555 nodes, 860 ms Style & Layout) and `reveal`/`motion`
  work, so idle arrives late: ~0.54 s locally unthrottled, ~3 s under PageSpeed's desktop throttling. Chunks then load in a
  cascade (island → renderer → hooks/preact/jsx runtime), one hop at a time.
- It is **not** a visitor-facing delay: the loader overlay covers the page until then. Pulling hydration earlier (`client:load`) would
  only move the same work (forced reflow in `hooks.js` ~50 ms, `BackToTop` ~45 ms, `reveal.js` ~50–76 ms) into the busy window and raise TBT.

## Change
`scripts/modulepreload.ts`, chained after `astro build` in `npm run build`: reads `dist/index.html`, collects the component/renderer
URLs of every `load`/`idle`/`media` island plus the page's module scripts, follows their static imports in `dist/_astro`, and adds
`<link rel="modulepreload" fetchpriority="low">` for each (16 modules, ~40 KB, a few hundred bytes of HTML after compression).
`client:visible` islands (Editorial) are skipped. Hydration timing and behaviour are unchanged; only the fetch moves to parse time.

## Verification (local, unthrottled)
Chunk requests start at 145–190 ms instead of 537–576 ms; 16 chunk requests, no duplicates; 7 of 8 islands hydrate (Editorial waits for
scroll, as before); `fouc-check`, `behavior-check` pass. Confirm on the deployed site with PageSpeed: expect the maximum critical
path latency to drop to roughly the document plus one hop.

## Not changed / still open
- Cloudflare's automatic Web Analytics beacon (`beacon.min.js`, 10 KiB, "legacy JS", 1 d cache, `/cdn-cgi/rum`) is back since doc 71 and
  accounts for the "legacy JavaScript", "efficient cache lifetimes" and "3rd parties" insights: disable it in the dashboard.
- Desktop CLS 0.010 on `.shell.hero__grid` (new in the live run; locally 0): likely residual critical/full CSS drift in the hero; investigate.
- TBT (`loader.min.js` tasks 196 + 157 ms on mobile), non-composited animations, unused CSS 17 KiB.
