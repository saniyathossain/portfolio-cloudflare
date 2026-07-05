# Design.md — Saniyat Hossain Portfolio

Precise reference for the design system as it exists **today**. `docs/aidlc/00-23` is the
chronological decision log (why things changed, in order); this file is the current-state snapshot —
if the two disagree, this file and the live code win. Re-derive this doc from `styles.css` /
`index.html` / `portfolio.json` whenever a redesign round lands, rather than trusting memory of past
rounds (several `docs/aidlc/0N` files describe intentions later reversed by a subsequent round — see
"Provenance & known doc drift" at the end).

## 1. What this is

A personal portfolio for **Mohammad Saniyat Hossain**, Staff Software Engineer. Single-page,
light-theme, content-driven site. Visual language: **macOS Tahoe "Liquid Glass"** applied on top of
the **Lumora** design template (see §9 for what Lumora contributed vs. what was replaced). No SPA
framework, no client-side router, no build-time bundler — Alpine.js drives the small amount of
reactive state (carousels, accordions, popovers, modal); Motion One drives a few desktop-only
physics-feel effects; everything else is CSS.

**Stack:** plain HTML + Alpine.js (vendored) + Motion One (vendored) + Tailwind (precompiled utility
layer) + a hand-written design system in `styles.css` + system **SF Pro** / self-hosted **Inter**
fonts. Served by a Cloudflare Worker (`src/index.js`) in front of Cloudflare Static Assets.

## 2. Information architecture

Section order (top to bottom), each a `<section>` unless noted:

1. `#home` — Hero (photo, name, rating, CTAs, "Now" card, partner row, clock in nav, scroll status)
2. `#about` — About statement + globe motif + social row
3. *(unlabeled, `aria-label="We build better"`)* — CreateBand: 4-tile "We / Build / → / Better"
4. `#services` — "What I do" — 4-row service list
5. `#experience` — Company groups → expandable role rows → tenure popovers → stack/AI pills
6. `#skills` — Skill category panels
7. *(unlabeled, `aria-label="Statistics"`)* — Stats panel (dark card, count-up numbers)
8. `#education` — Degree history
9. `<footer class="site-footer">` — CTA + nav/contact columns, outside the section flow

Overlay-style, not sections: nav menu drawer, request/contact modal, popovers.

**Departure from the original Lumora template:** Lumora's `Portfolio` ("Selected Work", 4 dark
project cards with fabricated case studies) was **dropped entirely** — there's no real project-case-
study content for this CV, and the content rule (§6) forbids fabricating it. Its nav slot and "View
Work" CTA were redirected to `#experience` instead. Every other Lumora section survived in the same
relative position (CreateBand still between About and Services; Stats still between Skills and
Education). Lumora's Lenis-driven smooth scroll and the request-modal's fake network submit were
similarly not carried over as-is (native scroll; modal wired to a working `mailto:`/contact flow, not
a stub).

## 3. Content architecture

- **Single source of truth:** `public/assets/data/portfolio.json`, loaded by `data.js` before
  anything else boots (`window.portfolioDataReady`). Top-level keys: `site`, `sections` (per-section
  subtitle copy), `profile`, `nav` (5 items), `heroCards` (3, the "Now" card carousel),
  `partners` (5, logo + brand color), `createBand` (4), `services` (4), `stats` (4), `skills` (5,
  each with an items list), `education` (3), `socials` (4), `companies` (5 slugs), `experiences` (8
  role records: id/companySlug/role/employmentType/period/summary/details/stacks/aiTools),
  `manifest` (PWA fields).
- **CV truth:** `docs/cv-modern-template.md` — the canonical bio/experience text. `portfolio.json`
  must mirror it; never invent CV content (roles, dates, stats) not present there.
- **`<head>` is generated**, not hand-authored: `node scripts/sync-head.js` regenerates the SEO meta
  block and the H1 from `site`/`profile` in the JSON and writes them between
  `<!-- SYNC:HEAD:START/END -->` and `<!-- SYNC:H1:START/END -->` markers in `index.html`. It also
  independently computes the same content-hash used for cache-busting (see §8) and stamps every
  `?v=` in the head's `<link>`/`<script>` tags.
- Section subtitles (`sections` map in the JSON) are applied via `data-sec-sub` + a plain
  `_applySectionSubs()` call, not an Alpine binding — they're static per-load, not reactive.

## 4. Visual design tokens (current — `styles.css:19-95`)

**Core palette:**
```
--bg:#ffffff  --fg:#111111  --ink:#0a0a0a  --muted:#8d8d8d  --subtle:#b6b6b6
--line:#e6e5e2  --surface:#f1f0ee  --surface2:#e3e2df
--accent:#b15f2c  --accent-bright:#cf8047  --accent-dark:#97501f      (copper — brand/CTA/hero-card)
--beige:#7f6a49                                                        (hero designation text)
--primary:#2f9fd6  --primary-deep:#1a6f96                              (azure, drawn from portrait shirt)
--teal:#2b8c9a  --teal-deep:#1a6773                                    (drawn from portrait sea)
--tint / --tint-deep                                                   (default = primary; overridden per section, see below)
```
**Aurora / Tahoe system hues** (ambient background field + `[data-ci]` per-item hue map):
```
--c-violet:#6e6cf0  --c-blue:#0a84ff  --c-cyan:#64d2ff  --c-teal:#3fd0e0
--c-amber:#ff9f0a   --c-rose:#ff5c8a  --c-green:#30d158  --c-mint:#5fe0c6
```
`[data-ci="blue|teal|purple|orange|cyan|green|pink|indigo|mint"]` maps list rows (experience items,
stat cards, service rows) to one of these hues via `--tint`/`--tint-deep`, so a repeating list reads
as a spectrum instead of one flat color.

**Per-section `--tint` overrides** (`styles.css:366-370`): `#home` uses the default azure `--primary`;
`#about` → teal; `#services` → copper `--accent`; `#experience` → blue (`--c-blue`/`#1f63ad`);
`#skills` → cyan; `#education` → green. Anything that needs to stay on-brand regardless of which
section it's scrolled into (nav pill, hero-card badge) pins to `--accent` explicitly instead of
inheriting ambient `--tint` — see §5.

**Glass material:**
```
--glass-bg:rgba(255,255,255,.2)         --glass-bg-strong:rgba(255,255,255,.38)
--frost-bg:rgba(255,255,255,.74)         (faux-frost for SCROLLING glass — no backdrop-filter)
--glass-border:rgba(255,255,255,.85)
--glass-blur:blur(26px) saturate(215%)   --glass-blur-lg:blur(38px) saturate(220%)
--glass-highlight: inset 0 1px 0 rgba(255,255,255,.85), inset 0 0 0 1px color-mix(in srgb, var(--tint) 20%, transparent)
--glass-shadow / --glass-shadow-hover
```
**Rule (non-negotiable, PageSpeed-driven):** real `backdrop-filter` is confined to small, **fixed**
(non-scrolling) chrome — the navbar, the analog clock disc, the request modal backdrop. Any glass
surface that **scrolls with the page** uses `--frost-bg` (an opaque gradient approximation) instead —
"faux-frost" — because `backdrop-filter` on a large scrolling surface tanks mobile PageSpeed. Do not
add `backdrop-filter` to a scrolling panel; this has been tried and reverted more than once (see
`docs/aidlc/16`, `18`, and this session's hero-card-badge blur revert).

**Radii / layout:** `--radius-pill:9999px` `--radius-card:2rem` `--radius-card-sm:1.25rem`
`--radius-control:0.875rem`. Shell max-width `--shell:88rem`. Watermark type size `--watermark:13rem`.

**Easing/duration tokens:**
```
--ease-spring: cubic-bezier(0.16,1,0.3,1)     (has overshoot — use sparingly, avoid on anything the
                                                user explicitly wants calm/"drawer"-like)
--ease-glass:  cubic-bezier(0.32,0.72,0,1)    (Tahoe deceleration — default for glass/hover motion)
--ease-smooth: cubic-bezier(0.22,0.61,0.36,1) (no-overshoot decelerate-and-stop — default for
                                                "calm"/drawer-style reveals)
--ease-reveal, --ease-word, --ease-hover, --ease-pill-reveal, --ease-pill-expand  (narrower-purpose)
--dur-fast:0.45s  --dur-mid:0.7s  --dur-slow:1.05s  --dur-reveal:0.88s
--dur-pill-reveal:1s  --dur-pill-expand:0.4s
```
**Typography:** `--font-sans: "Inter", "Inter Fallback", -apple-system, BlinkMacSystemFont,
ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;` — **Inter leads on
every platform** (self-hosted, `@font-face` at `styles.css:115`), for identical rendering across
Mac/iOS/Windows/Android/Linux. `"Inter Fallback"` is a second `@font-face` with metric-override
descriptors (`ascent-override`, `size-adjust:107.06%` etc.) matched to Inter's metrics, so text
doesn't reflow/CLS while the real font loads. `--font-mono` for tabular/code contexts.

**Text shadow tokens** (`--text-sh`, `--text-sh-sm`, `--text-sh-dark`, `--text-sh-emboss`,
`--text-sh-tint`) give headings a subtle "lift" (light top edge + soft dark base) rather than a flat
color — used instead of any actual outline/stroke.

## 5. Component library (current)

- **`.glass-panel` / `.glass-card`** (`styles.css:261+`) — the two base "frosted" containers; panel
  for content blocks (services list, exp list, stats), card for smaller standalone tiles. Both use
  `--frost-bg` (faux-frost), not real blur, since they scroll with the page.
- **Shiny icon-chip family** — the site's signature "premium" tile treatment, reused verbatim
  everywhere an icon needs a tinted glass background: `.icon-chip` (+ `--sm`/`--md` size variants),
  `.service-row__icon`, `.exp-row__icon`, `.point-chip`, `.nav-desktop__pill`, `.hero-card__badge`,
  `.hero-card__arrow`. Canonical recipe (identical formula, only the tint variable differs):
  ```css
  background: linear-gradient(145deg, color-mix(in srgb, var(--tint) 32%, #fff),
                                       color-mix(in srgb, var(--tint) 12%, #fff));
  border: 1px solid color-mix(in srgb, var(--tint) 24-26%, transparent);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.65-.7),
              0 2-3px 8-10px -3px color-mix(in srgb, var(--tint) 42-45%, transparent);
  ```
  plus a shared diagonal specular `::before` gloss overlay (`linear-gradient(125deg,
  rgba(255,255,255,.62) 0%, rgba(255,255,255,.16) 30%, transparent 54%)`, opacity `.72 → 1` on
  hover). Elements that must stay on-brand regardless of ambient section color (nav pill, hero-card
  badge/arrows) substitute `--accent` for `--tint` directly rather than inheriting the section's tint.
  **Do not replace this family with neutral backdrop-filter-only glass** — tried and explicitly
  rejected (see `docs/aidlc/01`/skill doc).
- **`.brand-pill`** (`styles.css:1933+`) — gradient pill with a brand-colored mono badge + sheen
  sweep `::before`, used for stack/AI-tool tags in Experience and Skills. `--stack`/`--ai` variants
  tint the pill background. **Not** used for the hero "Worked with" row (see `.partner-orb` below) —
  those are two different components solving different layout problems, don't conflate them.
- **`.partner-orb`** (hero "Worked with" row) — fixed-size circular icons (never resize on hover, so
  a hover on one can't reflow/jiggle its neighbors — this was a real bug, see `docs/aidlc/23`
  Revision 5) with a floating macOS-Dock-style name tooltip revealed above on hover/focus.
- **`.hero-card`** ("Now" card) — the hero's job-status/carousel widget. Desktop/fine-pointer only:
  collapses to just its badge, flush against the aside column's right edge (merged — no visible
  card chrome around it at rest), and opens into the full card on hover/focus via `clip-path`
  (right inset never moves, so the reveal only ever grows away from the fixed badge — the
  "genie"/anchored-reveal feel) plus the badge sliding via `transform: translateX(...)` between its
  collapsed and natural positions. Mobile/no-hover: always fully expanded, badge keeps its border/
  shadow permanently (nothing to merge into without a hover state). Full mechanics and the
  significant CSS-specificity bug this uncovered are documented in `docs/aidlc/23` Revisions 6-9 —
  read that before touching this component again, it has non-obvious gotchas (see §10).
- **Nav pill** (`.nav-desktop__pill`) — a sliding "liquid" active/hover indicator behind the desktop
  nav buttons, position driven by `--pill-x`/`--pill-w`/`--pill-h`/`--pill-o` custom props written
  from JS (`setupNavPill()` in `app.js`, IntersectionObserver-based scroll-spy + hover tracking), not
  by Alpine bindings — CSS transitions the props for the actual glide.
- **Analog clock** (`.clock-face`) — a small frosted-glass disc in the header, real `backdrop-filter`
  (allowed here: fixed-size, non-scrolling chrome). Hands + tick marks driven by `--clock-h`/
  `--clock-m` custom props; the seconds hand is a phase-locked CSS keyframe sweep
  (`--clock-s-delay`, set once by `initClockSweep()` in `app.js`) rather than re-computed every
  tick, so it never visibly jumps.
- **Stats panel** — dark `.spec.spec--panel` card, `--data-count` attributes drive a scroll-triggered
  count-up (progress-based, not a fixed timer).
- **Exp rows / Service rows** — expandable list rows (`.exp-row`, `.service-row`) each with an
  icon-chip-family icon, hover-fill background, and (Experience only) an accordion detail panel +
  tenure popover.
- **Reveal system** (`[data-reveal]`, `.blur-reveal`, `data-stagger`) — IntersectionObserver-driven
  entrance animation, `mode: once`. **`.blur-reveal` never animates `filter`** (`docs/aidlc/37`):
  animating `filter: blur()` is not compositor-accelerated in WebKit (it re-runs the blur shader every
  frame while the radius changes — layer promotion can't fix that), which made the reveals sluggish in
  Safari. Instead each word carries a STATIC pre-blurred overlay copy (`.brw__blur`, painted once) over
  the sharp text, and the reveal crossfades the blur copy out + slides the word up using **only opacity
  + transform** — compositor-only, smooth in every browser by construction. Long copy groups into a few
  segment-spans (headings stay per-word) to keep the DOM light. Do **not** reintroduce an animated
  `filter` transition here. **Specificity gotcha:** `[data-reveal].is-visible` sets its own
  `transition`/`transform` at specificity (0,2,0) — any component-specific transition/transform rule
  on an element that also carries `data-reveal` must out-specify this (e.g.
  `.hero__aside .hero-card[data-reveal]`, not just `.hero-card`) or it will silently lose the
  cascade and its transition-property list gets truncated, causing implicated properties to snap
  instead of animate. This bit `.hero-card`'s clip-path transition for several rounds before being
  diagnosed — see `docs/aidlc/23` Revision 8.

## 6. Motion & interaction principles

- **Compositor-only properties** (`transform`, `opacity`, `clip-path`, `background-position`,
  `filter`) for anything that repeats or scrolls with the page. Width/height/padding reflow
  animation is reserved for small, solitary, above-the-fold elements where the blast radius of a
  reflow is provably contained (e.g. the hero-card's own `padding-right` toggle) — never for a
  repeating row (partner icons, list rows), where it visibly pushes siblings.
- **Hover-only interactions gated by `@media (hover: hover) and (pointer: fine)`**, with the
  non-hover fallback being the fully-expanded/safe state, not a broken collapsed one — verified via
  real touch-device emulation (`devices['iPhone 13']` in Playwright), not just a narrow-viewport
  assumption (`(hover:hover)` and viewport width are independent).
- **Every transition/animation is `prefers-reduced-motion`-gated.** In practice this is enforced
  globally: `styles.css` has a blanket
  `*, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }`
  under `@media (prefers-reduced-motion: reduce)`, so component-level reduced-motion overrides are
  usually redundant belt-and-braces, not the primary mechanism.
- **JS-driven transforms win over CSS transforms, always.** `motion.js`'s `tilt()` (Motion One)
  writes `rotateX`/`rotateY` directly to an element's inline `style.transform` continuously on
  pointer move (used on `.hero-card` and magnetic CTAs). Inline style always beats any stylesheet
  rule for the same property, so a CSS `transform` transition/value on an element that also has a
  JS pointer-tilt effect will silently never render — confirmed the hard way when a hero-card
  `scale()` "genie" effect was added, then found to be dead code. If a component needs both a JS
  tilt effect and a state-driven transform, drive the state-driven part through a **different**
  property (a child element's own `transform`, or `clip-path`/`opacity` on the parent) instead of
  fighting for the same `transform` property.
- **Calm over springy, by explicit user preference.** `--ease-spring` (has overshoot/bounce) is
  available but has been explicitly rejected for anything described as a "drawer" — use
  `--ease-smooth` (no overshoot, decelerate-and-stop) for open/close panel motion.
- **Symmetric open/close.** Prefer one shared `transition` declaration covering both the rest state
  and the interactive-state override, rather than separate faster/slower rules per direction — this
  guarantees opening and closing feel identical (provably, not just visually) since they're driven
  by the same declaration.

## 7. Layout & responsive grid

Breakpoints in active use: **360 / 768 / 1024 / 1440** (the four verification widths for every visual
change), implemented via plain `min-width`/`max-width` media queries (no CSS framework grid system —
Tailwind utilities are used for spacing/typography primitives, the actual grid/flex layout logic
lives in `styles.css`). `1024px` is the primary "desktop layout" threshold (nav switches to the
desktop pill nav, hero switches to a 2-column grid, hover-only interactions become reachable since
`pointer:fine` correlates with desktop but is checked independently). `.shell` (max-width `88rem`,
`margin-inline:auto`) is the page-width constraint reused by every section, inherited from Lumora.

## 8. Build, caching & performance

- **No npm/node_modules at runtime** — Alpine.js and Motion One are vendored (checked-in minified
  files under `public/assets/js/vendor/`), by design, to keep the deploy artifact self-contained and
  avoid a JS build step.
- **Build pipeline** (`build.sh`, run before every deploy):
  ```
  ./build-css.sh → node scripts/minify-css.js → ./scripts/setup-fonts.sh
  → node scripts/optimize-images.js → node scripts/set-asset-version.js
  → node scripts/minify-js.js → node scripts/sync-head.js → node scripts/hash-sw.js
  ```
  `build-css.sh` downloads the pinned **Tailwind standalone CLI v3.4.19** to `bin/` and compiles
  `tailwind.input.css` → `public/assets/css/tailwind.css`. `minify-css.js` bundles
  `tailwind.css` + `styles.css` → `styles.min.css` (what `index.html` actually links). Only run
  `build-css.sh` when you've added a **new Tailwind utility class** to markup; for everything else,
  editing `styles.css` + re-running `minify-css.js` (or the full `build.sh`) is enough.
- **JS is source → `.min.js` twin**, same split as CSS: every hand-written file under
  `public/assets/js/` (`data.js`, `icons.js`, `loader.js`, `boot.js`, `app.js`, `reveal.js`,
  `blur-reveal.js`, `motion.js`, `liquid-hero.js`, `aurora.js`) stays fully commented/readable as the
  edit target; `scripts/minify-js.js` generates the `.min.js` counterpart that `index.html`/`boot.js`
  actually load (~37% smaller in aggregate). Unlike CSS, this goes through `esbuild` (via `npx`, network
  at build time only) rather than a hand-rolled stripper — several files have real regex literals and
  `//` inside string literals that a naive comment-stripping regex could corrupt; esbuild parses the
  AST for real. Vendored libraries (`vendor/alpine.min.js`, `vendor/motion.min.js`) are unaffected —
  already minified upstream, not touched by this script.
- **Company/school logos**: same "immutable master → generated derivative" pattern as the hero photo.
  `optimize-images.js` resizes oversized source PNGs (some shipped at native resolution up to 512×512
  despite rendering at 28-48px) down to ≤192px and re-encodes as WebP via `cwebp`; `portfolio.json`'s
  `logo` fields point at the `.webp` output, the PNG masters stay committed as source.
- **Cache-busting is content-hash based**, not a manual version bump: `set-asset-version.js` hashes
  `public/` (excluding self-referential `index.html`/`boot.js`/`boot.min.js`/`sw.js`) and stamps the
  result into `boot.js`'s `ASSET_V` constant and `src/index.js`'s Early-Hints preload strings (CSS
  bundle + the Bismillah header logo, see §5); `sync-head.js` independently computes the **identical**
  hash and stamps every `?v=` in `index.html`'s head links and the four `.min.js` body `<script>` tags,
  so everything always agrees. `hash-sw.js` uses a related-but-distinct hash (different exclude set —
  service-worker cache versioning, not asset URLs) via the shared `scripts/lib/build-hash.js` helper.
- **Never hand-edit:** `styles.min.css`, any `.min.js` file, the `<!-- SYNC:HEAD -->`/`<!-- SYNC:H1 -->`
  blocks in `index.html`, `boot.js`'s `ASSET_V` line, or `src/index.js`'s Early-Hints `?v=` — all of
  these are regenerated by the pipeline above and will be silently overwritten (or worse, drift out of
  sync with each other) if edited by hand.
- **Cloudflare Worker** (`src/index.js`): serves `public/` via Static Assets, sets security headers
  (CSP restricting `script-src`/`style-src` to `'self' 'unsafe-inline'` — Alpine + inline loader need
  it, a nonce would force a per-request HTML rewrite that defeats edge caching; `font-src 'self'`,
  `frame-ancestors 'none'`, plus cross-origin isolation `Cross-Origin-Opener-Policy`/
  `Cross-Origin-Resource-Policy: same-origin`, `X-Permitted-Cross-Domain-Policies: none`, and a
  locked-down `Permissions-Policy`), sets cache headers (`/assets/*` → immutable 1yr,
  `/assets/data/*.json` → 1hr, `/` and `*.html` → must-revalidate), and injects an Early-Hints
  `Link: rel=preload` header for the hero LCP image and the critical CSS bundle.
- **Non-negotiable guardrails:** Google PageSpeed 100 (mobile — this has regressed and been fixed at
  least twice, see `docs/aidlc/18` and `22`; the recurring failure mode is the hero photo being
  served at native/oversized resolution, not just re-encoded — and, per `docs/aidlc/23` Revision 10,
  the same oversized-source-image mistake recurred with company/school logos, now covered by
  `optimize-images.js` too), SEO meta present in the first HTML byte (server-rendered `<head>`, not
  client-injected), light-theme only (no dark mode), no new network requests introduced by any change
  (fonts/icons/images are all local/vendored — repeated small SVGs go in the `<symbol>`/`<use>` sprite
  near the top of `<body>` rather than duplicating markup or fetching a separate file; only large,
  one-off vector art is worth externalizing to a cacheable asset), CSP kept intact, no inline
  `style=""` in HTML (use Alpine `:style`/`:class` or JS `el.style`/custom properties instead).
  **Caveat on "100" claims:** always verify with a real Lighthouse run (`npx lighthouse` against a
  local static server works fine for this) rather than assuming — this sandbox can't fully reproduce
  Cloudflare's edge (HTTP/2, Brotli, global caching), so a local run's *network*-throttled numbers
  will look worse than production; isolate CPU-only throttling (`--throttling.cpuSlowdownMultiplier=4`
  with the network throttling fields zeroed) to see the code-attributable score separately from
  infrastructure the sandbox can't represent.

## 9. Relationship to the Lumora template

This site is a content-and-brand adaptation of the **Lumora — Independent Design & Engineering
Studio** landing-page template (`docs/template-prompt-getlayers.ai-lumora-template.md` has the full
original spec: dark-ink/near-white palette, Onest typeface, Lenis smooth scroll, canvas liquid-cursor
hero reveal, react-spring-style entrance motion, `000→100` loader). What was kept structurally: the
`.shell` page-width constraint, the rem-based section rhythm, the pill-button/eyebrow/tag-chip
component shapes, the reveal-on-scroll interaction language, the overall section ordering. What was
replaced: the visual material system (Lumora's flat near-black-ink-card look → this site's Tahoe
"Liquid Glass" — frosted panels, aurora ambient color, per-section tint hues), the typeface (Onest →
Inter/SF Pro), Lenis (removed — caused wheel-freeze issues; native scroll + a lighter parallax
instead), the canvas liquid-cursor hero effect (not carried over), and the fabricated "Selected Work"
Portfolio section (dropped — no real case-study content exists for this CV; see §2).

## 10. Where to look before a design change

- **This file** for current tokens/components/principles.
- **`docs/aidlc/05-redesign-liquid-glass.md`** for the original Liquid-Glass material-system
  rationale (Field/Glass/Ink layering).
- **`docs/aidlc/23-clock-navbar-hero-text-overhaul.md`** for the most detailed single case study of
  this codebase's recurring failure modes (reflow-vs-compositor jank, CSS specificity fights with the
  reveal system, JS-transform-vs-CSS-transform conflicts) and how each was root-caused — read it
  before touching hero-card, the nav pill, or the clock again.
- **`.cursor/skills/portfolio/SKILL.md`** for the day-to-day "how do I extend a section / add a
  brand / deploy" checklist — this file is the *why*, that one is the *how*.
- **`docs/cv-modern-template.md`** before changing any Experience/Education content — it's the only
  place CV facts may originate from.

## 11. Provenance & known doc drift

`docs/aidlc/` is a chronological log, not a maintained reference — several early entries describe
decisions later explicitly reversed by a subsequent entry, and this file (not the older entry) is
authoritative for current state:

- **Font strategy**: `docs/aidlc/01` and `07` describe an "SF Pro / system-font-first, Inter
  fallback-only, don't preload Inter" strategy (from doc 10's optimization pass). `docs/aidlc/21`
  explicitly **reverses** this to "Inter primary on every platform" for cross-platform rendering
  consistency, by direct request — that reversal is what's shipped today (§4 above). Don't restore
  the system-font-first approach based on reading doc 01/07 alone.
  - **Grep-verify before trusting either narrative:** `grep -n "font-sans:" public/assets/css/styles.css`.
- **Portfolio/"Selected Work" section**: the original `REBUILD-PLAN.md`/template spec includes it;
  `docs/aidlc/02` and `04` confirm it was dropped for lacking real content. Current `index.html` has
  no such section — confirmed by `grep -n '<section' public/index.html` (§2 lists the actual order).
- **`scripts/minify-css.js` / `scripts/set-asset-version.js`**: part of the live `build.sh` pipeline
  (§8) but not documented by name in any numbered `docs/aidlc` entry as of this writing — they were
  added after doc 21's "packaging" goals but before this file. If you add a new numbered aidlc entry
  for future work, consider backfilling a short note on when/why these landed.

When in doubt, prefer `grep`-verifying a claim against the live file over trusting either this
document or an aidlc entry from memory — CSS/JS/JSON are ground truth; every doc (including this one)
is a snapshot that can go stale the moment the code moves again.
