# Plan — Clock recolor, navbar restructure, hero face visibility, text shine

## Context
The header analog clock (recently rebuilt frameless with black hands + red second hand) doesn't
match the site's warm "Liquid Glass" palette — the user wants themed colors, a light hairline ring
back, and a stronger hover-grow. Separately: the navbar should be restructured with a sliding
"liquid" active-pill; the hero portrait's face is partly covered (desktop: the glass card overlaps
the beard/jaw; mobile: the portrait is a short band cropped to the top of the head, face barely
shown); and heading/hero text should get a richer but still-elegant "shine."

Confirmed directions (via user): **Clock = Copper accent** · **Hero = Reposition overlays** ·
**Navbar = Restructure (sliding pill)** · **Text shine = Refined & elegant**.

## Findings (from exploration)
- **Clock** (`styles.css` ~734–784): hands `#111`, second hand + `.clock-hand--s::after` + `.clock-pin`
  `#ff3b30`; `.clock-face` is frameless (`width/height:1.4rem`, no border); hover `scale(1.22)` gated
  by `@media (hover:hover) and (pointer:fine)`; second hand is a seamless 60s CSS sweep, phase-locked
  once via `--clock-s-delay` set by `initClockSweep()` in `app.js` — **keep this mechanism intact**.
- **Navbar** (`index.html` ~132–139, `styles.css` ~665–794): `.glass-pill` flex row; `.nav-desktop`
  renders `<template x-for="item in nav">` buttons (Home/Experience/Skills/Education/Contact), each with
  an `::after` accent underline on hover. **No active-section tracking exists** (`app.js` has only
  `navGo`, no scroll-spy). Reusable `IntersectionObserver` pattern exists in `reveal.js`.
- **Hero** (`index.html` ~166–265, `styles.css` ~807–923):
  - Desktop (≥1024px): grid `1.22fr 0.78fr`; photo backdrop `left:38%; width:62%`, `object-position:50% 12%`;
    `.hero__aside` (glass card + partner pills) is the right column at `align-items:flex-end` → **it floats
    over the face/beard**. Scrim (`.hero__backdrop-scrim`) washes the left ~48%.
  - Mobile (<1024px): stacked; photo `order:2`, `height:clamp(15–17rem…)`, `object-position:50% 10%` →
    **shows top-of-head, chin cut off**; card + pills sit above it.
- **Text tokens** (`styles.css` 91–95): `--text-sh`, `--text-sh-sm`, `--text-sh-dark`, `--text-sh-emboss`,
  `--text-sh-tint`. Headings use `--text-sh` (line 461); `.sec h2` uses `--text-sh-tint`; hero name has a
  bespoke 3-layer shadow (~992–1031).
- **Build/constraints**: edit `styles.css` only (never `styles.min.css`); `<head>` is generated. Pipeline
  `build.sh` → `minify-css.js` (bundles tailwind+styles → `styles.min.css`) → `set-asset-version.js`
  (content-hash `?v=`) → `sync-head.js`. Hard rules: PageSpeed 100, no new network requests, light theme,
  transform/opacity-only animation, every animation `prefers-reduced-motion`-gated, responsive at
  360/768/1024/1440, no inline `style=""` (use Alpine `:style` + CSS custom props). `backdrop-filter`
  only on fixed chrome (the navbar qualifies).

## Approach

### Tranche A — Clock recolor + light ring + bigger hover (`styles.css` only)
- Introduce hand colors via local vars on `.clock-face` for clarity:
  `--hand: #2a2a2a` (graphite), `--hand-accent: var(--accent)` (copper).
- `.clock-hand` bg → `var(--hand)`; `.clock-hand--s`, `.clock-hand--s::after`, `.clock-pin` → `var(--hand-accent)`.
- Re-add a **light hairline glass ring**: on `.clock-face` add a faint fill + border, e.g.
  `background: radial-gradient(circle at 34% 28%, rgba(255,255,255,.9), rgba(255,255,255,.55));`
  `border: 1px solid color-mix(in srgb, var(--ink) 12%, rgba(255,255,255,.6));`
  `box-shadow: inset 0 1px 1px rgba(255,255,255,.85), 0 1px 2px rgba(17,17,17,.08);` (airy, not heavy).
  Keep hands inset slightly so they don't touch the ring.
- Hover: bump `.clock-chip:hover .clock-face` from `scale(1.22)` → `scale(1.5)` (stays inside the
  existing `hover:hover`+`pointer:fine` block; reduced-motion block already disables the transition).
- **Do not touch** the second-hand sweep / `--clock-s-delay` logic in `app.js`.

### Tranche B — Navbar restructure: sliding liquid pill + active-section (JS + CSS + HTML)
- **HTML** (`index.html`, inside `.nav-desktop`): add one `<span class="nav-desktop__pill" aria-hidden="true"
  :style="navPillStyle"></span>` as first child; give the `x-for` button an `:class` active flag and
  `@mouseenter`/`@focus`/`@mouseleave` hooks + `x-ref`-free measurement via a shared handler.
- **JS** (`app.js`):
  - Add reactive state: `activeSection` (string id), `navHoverId` (string|null).
  - Add `initNavSpy()` — an `IntersectionObserver` (reuse `reveal.js` pattern) over each `<section id>`
    that sets `activeSection`; called from `init()`.
  - Add `measureNavPill()` — reads the target button's `offsetLeft`/`offsetWidth` (target =
    `navHoverId ?? activeSection`), writes `--pill-x`/`--pill-w`; recompute on `activeSection`/`navHoverId`
    change and on `resize` (rAF-throttled). Expose `navPillStyle` getter returning the `--pill-x/--pill-w`
    string for the `:style` bind (keeps inline-style ban satisfied).
  - Nav buttons call `navHoverId = item.id` on enter/focus, `navHoverId = null` on leave.
- **CSS** (`styles.css`): `.nav-desktop{position:relative}`; `.nav-desktop__pill{position:absolute; left:0;
  height:…; width:var(--pill-w); transform:translateX(var(--pill-x)); border-radius:var(--radius-pill);
  background: color-mix(in srgb, var(--accent) 12%, rgba(255,255,255,.5)); box-shadow: soft glass;
  transition: transform .42s var(--ease-glass), width .42s var(--ease-glass); z-index:0;}` — nav buttons
  sit above it (`z-index:1`), text stays crisp. Retune nav spacing/hover; drop or soften the old `::after`
  underline (the pill replaces it). Gate the pill transition off under `prefers-reduced-motion` (snap, no
  slide). Integrate the new clock styling visually (spacing) in the same pill.
- Fallback: if IO unsupported or JS idle, pill defaults to the Home item (static `--pill-x:0`); nav remains
  fully usable (buttons still call `navGo`).

### Tranche C — Hero face visibility: reposition overlays (CSS-first; minimal HTML)
- **Desktop (≥1024px)**:
  - Nudge photo `object-position` so the face sits in the open right area (try `58% 12%`), and shift the
    backdrop's clear gap so the card zone is over sea/shirt, not the face.
  - Move `.hero__aside` so the glass card floats **below/right of** the face: increase its top offset
    (remove/adjust `margin-top:-2.5rem`) and/or push partner pills into the lower-right corner. Reduce card
    footprint slightly. Goal: face (eyes→beard) unobstructed.
  - Ease `.hero__backdrop-scrim` over the face band (lower the mid-stop opacity) while keeping left-edge
    wash for text legibility.
- **Mobile (<1024px)**:
  - Increase `.hero__backdrop` height (`clamp(20rem, 64vw, 30rem)`) and set `object-position` to center the
    **face** (≈`50% 20%`) so eyes/nose/beard show, not just hair.
  - Ensure the card/partners don't overlap the portrait band (they're already `order:1` above it; verify gap).
  - Lighten the top scrim so the face reads.
- Verify contrast: the on-photo hero copy must stay legible — keep the left/top scrim strong enough where
  text sits; `.hero__copy--on-dark` swap logic (JS) still applies.

### Tranche D — Text shine (Refined & elegant) (`styles.css` only)
- Enrich tokens conservatively: give `--text-sh` and `--text-sh-emboss` a slightly deeper dark layer + a
  crisper `0 1px 0 rgba(255,255,255,.9)` top highlight (emboss "lift"), no new network/filters.
- Apply the emboss-lift to `h1–h4`/`.sec h2` and add a soft, tasteful highlight to the hero name
  (`.hero h1 .line-inner`) — subtle glow + crisp edge; keep the copper surname (`.grad`) with a light
  `drop-shadow` only. No animated sheen (PageSpeed/subtlety); everything transform/opacity/color/shadow-static.

### Tranche E — Rebuild, version, docs
- Regenerate: `node scripts/minify-css.js` → `node scripts/set-asset-version.js` → `node scripts/sync-head.js`
  (or run `./build.sh`). Never hand-edit `styles.min.css` or the generated `<head>`.
- Write `docs/aidlc/23-clock-navbar-hero-text-overhaul.md` (AIDLC format: Context → Findings → Decisions →
  Tranches → Guardrails) capturing these decisions.

## Critical files
- `public/assets/css/styles.css` — clock (~734–784), navbar (~665–794), hero (~807–923 + media queries
  ~836–847, ~1991–2041), text tokens (91–95) + heading/hero shadow rules.
- `public/index.html` — `.nav-desktop` pill span (~132–139); hero `.hero__aside`/card markup if a wrapper
  is needed (~166–265). (Body only — not inside SYNC markers.)
- `public/assets/js/app.js` — `activeSection`/`navHoverId` state, `initNavSpy()`, `measureNavPill()`,
  `navPillStyle` getter, nav hover hooks; **leave clock sweep untouched**.
- Reference: `public/assets/js/reveal.js` (IntersectionObserver pattern to reuse).
- Regenerated (do not hand-edit): `styles.min.css`, `<head>` block, `boot.js`/`src/index.js` `?v=`.

## Verification
1. `./build.sh` (or the 3 regen scripts) — confirm no errors, `?v=` hash updated everywhere.
2. Headless-browser screenshots at **360 / 768 / 1024 / 1440** (Playwright + local static server):
   - Clock: copper second hand, graphite hour/min, light ring; hover grows ~1.5×; second hand sweeps
     smoothly (no jump) — verify `--clock-s-delay` unchanged across ticks.
   - Navbar: pill slides under hovered item and rests under the active section on scroll; text stays crisp.
   - Hero: face (eyes→beard) unobstructed on desktop; mobile portrait shows the face, not top-of-head;
     hero copy still legible.
   - Text: headings/hero show the refined shine, still clean.
3. Emulate `prefers-reduced-motion: reduce` — pill snaps (no slide), clock second hand static, hover
   transition off; nothing broken.
4. Sanity: no new network requests (DevTools), brace balance in `styles.css`, `node --check` on `app.js`.

## Guardrails (unchanged)
PageSpeed 100 (transform/opacity/color/shadow only — no layout-animating, no new fetches). Light theme
only. `backdrop-filter` stays confined to the fixed navbar. All motion `prefers-reduced-motion`-gated.
No inline `style=""` — Alpine `:style` + CSS custom properties only. Responsive verified 360/768/1024/1440.
`styles.css` is the source of truth; `styles.min.css` and `<head>` are generated.

## Revision (post-review) — clock redesign
User rejected the copper-accent clock. Rebuilt as a **frosted translucent glass disc**
(`backdrop-filter: blur(6px) saturate(150%)` — permitted since the navbar is fixed chrome),
**bigger** (1.4rem → 1.85rem), **bigger hover** (1.5× → 1.8×), with **understated graphite**
hands (charcoal `#2a2f38` hour/minute, slate `#5b6472` second) — no bright color. The larger face
makes the seamless 6°/sec second-hand sweep actually readable (the earlier "second hand didn't move"
was just imperceptible motion on a 1.4rem face; the sweep itself was verified running). Second-hand
`--clock-s-delay` phase-lock mechanism unchanged.
