# 37 — Safari-safe reveal, SOLID/ThemeForest code, hardened Worker, elevated glass

Full-sweep revamp round. Brief: "act as web designer + software architect, do a full system-design
revamp and optimization" with references (getlayers/Lumora, spell.sh blur-reveal, beam.jakubantalik,
skiper/vengence/animmasterlib, headlessui), targeting: impeccable/premium macOS-Tahoe look, fully
responsive, PageSpeed 100 web+mobile, **smoother in all browsers (the experience reveal is sluggish
in Safari — major overhaul)**, SOLID/early-return/commented/readable, secure, no runtime npm/CDN,
standard section whitespace, ThemeForest-compliant. User steer: mix substance + visual elevation,
**keep** the liquid-glass / shiny icon-chip / tech-icon / frosted-blur language and elevate it; keep
the blur reveal but make it Safari-safe; add hardening headers + cleanup, no CSP nonce.

Three parallel code explorations (not assumptions) established ground truth before any change: the
Safari lag was root-caused, whitespace/typography were found already largely standard, and the
code/security gaps were concrete and small. Plan: `.claude/plans/expressive-stirring-hoare.md`.

## What shipped

### A. Safari-safe blur reveal (the headline)
Root cause: every section heading (`data-blur-reveal`) animated `filter: blur(12px) → 0` **per word**
(`styles.css` `.blur-reveal__word`; `blur-reveal.js`). Animating `filter` is not compositor-accelerated
in WebKit — each in-flow word span forces a full software repaint every frame, many at once. Affected
**all** sections, worst on the 22-word About statement. Kept the de-blur aesthetic, removed the cost:
- **GPU layer promotion during the animation only** (`blur-reveal.js` `reveal()`): set
  `will-change: filter, opacity, transform` per span on reveal, release it on that span's
  `transitionend` (with a `PROMOTE_MAX_MS` timeout backstop). WebKit then rasterizes the blur into a
  compositor layer once instead of repainting the region each frame. Releasing on settle avoids a
  permanent compositor-layer/memory cost.
- **Node-count cap for long copy** (`splitWords()`): headings (≤10 words) keep one span per word for
  the staggered wave; long copy groups into `LONG_COPY_GROUP`-word segment-spans (About: 22 words →
  9 promoted segments instead of 22 filter layers). A segment always holds a single highlight key, so
  keyword coloring still lands exactly; `data-blur-max-segments` overrides.
- **Radius 12px → 7px** + `backface-visibility: hidden` (`.blur-reveal__word`). Blur paint cost scales
  super-linearly with radius, so this alone is a large WebKit win.
- **Deliberately did NOT add `contain: paint`** — it would clip the headings' `--text-sh-tint` glow.
  Layer promotion already bounds the repaint region.

### B. SOLID / ThemeForest code
Measured refactor (the audit already rated the code readable/early-returning/well-commented — the real
deltas were small): hoisted a named `T` timings + `HERO_ON_DARK_LUM` constants object in `app.js` and
replaced the scattered magic literals; guarded the `keydown` (`_onKey`) listener against double
registration; added per-file authorship/license banners to all 10 hand-written JS files + `src/index.js`;
kept the `boot.js` `console.error` (a deliberate data-load-failure diagnostic, clean on the happy path).
**Did not** force-split `setupNavPill`/`setupHeroContrast` — they are cohesive closures sharing local
state; splitting would thread that state around and reduce clarity while risking the heavily-debugged
scroll-lock/contrast behavior.

### C. Worker security hardening (headers only, no nonce)
Added to `src/index.js` `SECURITY_HEADERS`: `Cross-Origin-Opener-Policy: same-origin`,
`Cross-Origin-Resource-Policy: same-origin`, `X-Permitted-Cross-Domain-Policies: none`, and
`payment=(), usb=()` on `Permissions-Policy`. CSP unchanged — `'unsafe-inline'` stays (Alpine + inline
loader), so no per-request HTML rewrite and edge caching/PageSpeed are untouched.

### D. Elevated glass + spacing
- **Tint-aware panel beam**: `.spec--panel::after` spotlight is now a tinted white (each section's own
  `--tint`) at the same low alpha as the old flat white — services reads copper, experience blue,
  skills cyan. A real upgrade to the liquid-glass feel across all panels, driven by the existing
  `motion.js` pointer mechanism (nested `color-mix` holds hue + alpha). Stats panel keeps its dark
  white override.
- **Experience beam**: added `spec spec--panel` to `.exp-list` — the one large panel that lacked the
  cursor spotlight its siblings (services/skills/stats) already had, and the section the user cares
  about most.
- **CreateBand spacing**: `.create-band` padding-block `1.75/2.5rem → 2.25/3.25rem` — fixes the
  compressed pause between About and Services.
- **Deliberately skipped** a shiny-chip opacity bump and a navbar/modal frost micro-tune: imperceptible
  polish (rejected before) and, for frost, a mobile-PageSpeed risk on `backdrop-filter`.

## Verification
Real-WebKit frame measurement was not possible in-sandbox (the WebKit build fails host-library
validation and won't launch), but every fix is engine-agnostic *code* behavior and was asserted
directly in Chromium + by construction: About 22→9 GPU-promoted segments with **0 lingering
`will-change`** after settle, highlights preserved, headings de-blur fully to `blur(0px)`, per-word
wave kept on short headings, experience beam present, reduced-motion shows every heading instantly
(no transition, no promotion), **zero console errors**. Screenshots at 1280/768/390 confirm the
experience content is fully legible under the beam and the About chunking wraps cleanly at 390px with
no overflow. New headers verified in source; CSP byte-identical. Bundle delta: `styles.min.css` +91B,
`app.min.js` +576B, `blur-reveal.min.js` +1.3KB — and the reveal is *cheaper* at runtime. The blur
techniques used (per-layer GPU promotion, radius reduction, node-count cap) are the canonical
WebKit-effective fixes; a production Lighthouse/real-Safari pass should confirm the smoothness gain.

## Build note (pre-existing, unchanged)
`set-asset-version.js` and `sync-head.js` hash different exclude sets (the latter includes
`boot.min.js`), so `src/index.js`/`boot.js` and `index.html` carry *different* `?v=` hashes — this is
already true at the committed baseline (`ac416…` vs `fa3b…`) and the live site runs PageSpeed 100 with
it, so it was left untouched as out of scope. Worth a future cleanup if the wasted Early-Hints preload
ever shows up in a Lighthouse audit.
