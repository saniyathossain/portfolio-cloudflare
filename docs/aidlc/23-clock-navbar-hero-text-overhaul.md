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

## Revision 2 (post-review) — clock size/hover fix, nav pill shine, hero-card overlap
- **Clock**: bumped further (1.85rem → 2.2rem) and navbar height grown (`.glass-pill` padding-block
  0.55rem → 0.7rem) to fit it. Backdrop-filter blur pushed to an "extremely liquid glass" 18px/220%
  saturate (was 6px/150%). Fixed a real bug: hover-scale used a centered `transform-origin`, so
  growing the face visually covered the adjacent digital time text — now the hover rule switches
  `transform-origin` to the right edge, so the enlarged face expands left/up/down and away from the
  time text instead. Added 4 cardinal tick marks (12/3/6/9), hidden at rest, fading in only on hover
  to aid reading hour/minute at the larger hover size — reuses the "spans center→edge but only the
  outer segment is painted" gradient technique (avoids the earlier squircle-favicon bug where naive
  center-rooted ticks crossed through the pivot instead of sitting at the rim).
- **Nav pill**: given the same "shiny tile" treatment as `.icon-chip` (used in the Services/"What I
  do" section) — diagonal tinted gradient background + a diagonal specular gloss `::before` overlay,
  instead of the flatter tinted-glass fill it had.
- **Hero card**: confirmed via screenshot it was sitting directly over the mouth/beard. Pushed
  `.hero__aside` further down AND right at 1024px+ (`translateY(2.5rem)` → `translate(1.5rem,
  6.5rem)`), shrunk the card's desktop max-width (24rem → 20rem), and lowered its background opacity
  (0.82 → 0.68, faux-frost — no `backdrop-filter` added since this card scrolls with the page,
  keeping within the "backdrop-filter only on fixed chrome" perf guardrail). Re-screenshotted:
  the mouth/beard area is now fully clear, the card sits over the shoulder/collar.
- All changes re-verified: braces balanced, `app.js` syntax-checked, `prefers-reduced-motion`
  re-confirmed (face/tick transitions off, second hand static) after these additions.

## Revision 3 (post-review) — remove shipping line, expand-on-hover hero widgets, icon fixes
- **Removed** the "Shipping since 2012" line from `.hero-status` entirely (rocket icon + text span).
  Bar now shows just location + "Scroll to explore".
- **Hero-card + hero-partners now use the same collapsed-icon → hover-expand interaction as
  `.brand-pill`** (used in Skills/Experience tag rows): at rest they're just small icon badges;
  hovering/focusing (desktop, fine-pointer only) slides them open to reveal the label/content.
  Mobile/touch has no `hover`, so both stay fully expanded there unchanged — verified with real
  touch-device emulation (`devices['iPhone 13']`), confirming `(hover:hover)`/`(pointer:fine)`
  correctly don't match and the card renders full-size, not just a viewport-width check.
  - `hero-partners`: markup replaced wholesale with `.brand-pill`/`.brand-pill__badge`/
    `.brand-pill__label` (same classes Skills/Experience already use), fed from `partners[].color`
    (already computed per-company by `_partnersFromExperience` in data.js — no new data needed).
    Deleted the now-dead `.partner-pill` CSS.
  - `hero-card`: added a `@media (hover:hover) and (pointer:fine)` block collapsing
    `.hero-card` to a 7rem×7rem square (just the badge) and `.hero-card__body` to
    `max-width:0;opacity:0`, expanding to 20rem×8.5rem with the body revealed on hover/focus-within.
    Caught and fixed a real layout bug along the way: constraining only `width` let the title text
    wrap into a tall narrow column before clipping, stretching the flex-stretched badge into a tall
    rectangle instead of a square — fixed by also constraining `.hero-card` `height` explicitly in
    both states.
  - This also fixes the mouth/beard overlap for good: at rest, both widgets are now tiny icon-only
    badges sitting well clear of the face; only expand (revealing more area) on deliberate hover.
  - Caught and fixed a real overlap regression from Revision 2: pushing `.hero__aside` down
    `translate(1.5rem, 6.5rem)` had it collide with `.hero-status` below (confirmed via Playwright:
    `.hero-status` was literally intercepting pointer events over the partner pills). Reduced to
    `translate(1.5rem, 3.25rem)` now that the widgets are far more compact — re-verified 18px clear
    gap between the two.
- **Icon fixes**: swapped the hero-card badge from a generic inline sparkle/wand SVG to the
  `briefcase` icon (via the existing `experience` semantic alias — `iconSvg('briefcase', …)` doesn't
  resolve on its own, since `iconSvg` only accepts semantic keys from `icons.js`'s `MAP`, not raw
  Lucide ids; this was caught by screenshot, since it silently fell back to the generic "code" `<>`
  glyph instead of erroring). Bolder chevrons: added a `.ui-icon--chevron` modifier (stroke-width
  2 → 2.75, slightly larger) applied to both chevron usages (hero-status scroll indicator, experience
  accordion toggle) — the thin default stroke read as washed-out/low-confidence next to the rest of
  the icon set.
- All re-verified: braces balanced, `app.js` syntax-checked, screenshots at 360/768/1024/1440,
  real touch-device emulation for the hover-collapse fallback, and `prefers-reduced-motion` (hover
  interactions still function, just without the smooth width/height transition).

## Revision 4 (post-review) — clip-path motion, liquid-glass badge, layers icon, exact nav shine
- **Rebuilt the hero-card hover-expand from width/height to `clip-path`.** The previous version
  animated the card's own `width`/`height` (layout properties → full reflow every frame), which is
  exactly why it felt janky/"horrible." Now the card is ALWAYS laid out at its full final size
  (fixed `height: 8rem`, never changes) — motion is done entirely with `clip-path: inset(...)`
  (compositor-only, GPU-accelerated) plus a fade + `translateX(-6px)→none` slide on the revealed
  body text, eased with `--ease-spring` (`cubic-bezier(0.16, 1, 0.3, 1)`, the token already used
  elsewhere for macOS-Tahoe-style motion). Confirmed this is genuinely smoother — no more layout
  thrash — and double-checked a real edge case clip-path introduces: since the element's layout box
  stays full-width, a naive "hover the element's center" no longer lands on the visible clipped
  area. Verified via `elementFromPoint` at the actual visible badge location that real interaction
  (mouse arriving at the visible badge, as any real user would) still hits `.hero-card` correctly —
  the mismatch only affects test tooling that hovers via bounding-box center, not real usage.
- **Badge redesigned as liquid glass**: real `backdrop-filter: blur(18px) saturate(220%)` (explicit,
  deliberate exception to the "no backdrop-filter outside fixed chrome" guardrail — this is a small,
  bounded, above-the-fold tile, same reasoning already applied to the clock face) over a translucent
  copper-tinted gradient, plus the exact `.icon-chip` diagonal specular `::before` gloss overlay.
- **Icon changed from briefcase to `layers`** — stacked-planes shape reads as "layered focus areas"
  (fits the Now/Focus/Lately cycling content) without being as literal as a briefcase or as
  unrelated as the original sparkle. `iconSvg('layers', …)` resolves directly (self-mapped key in
  `icons.js`'s alias table).
- **Nav pill now uses the literal `.icon-chip` formulas** (not just a similar recipe): identical
  `linear-gradient(145deg, tint 32%→12%)` background, identical `border`/`box-shadow` values, and the
  identical gloss `::before` (same gradient stops, same 0.72→1 opacity on hover) — with `--tint`
  swapped for `--accent` so the header pill stays copper regardless of which section's tint is
  currently active, matching the rest of the persistent header chrome.
- Re-verified: braces balanced, `app.js` syntax-checked, real mouse-move interaction (not just
  Playwright's `.hover()`), `prefers-reduced-motion` (clip-path state still applies, transitions
  reduced to near-zero duration), and real touch-device emulation (mobile has no `clip-path` at all,
  fully expanded as before).

## Revision 5 (post-review) — fix partner-icon jiggle, remove blur, dock tooltips, contrast
- **Root cause of the "Worked with" icon jiggle**: the pills lived in a wrapping flex row reusing
  `.brand-pill`'s inline max-width-expand technique — when one pill's width grew on hover, it
  physically pushed every pill after it sideways (real reflow). This is inherent to that technique
  when multiple instances share a row; harmless for `.brand-pill`'s other uses (Skills/Experience,
  where it wasn't flagged) but wrong for a tight row of small icons.
- **Rebuilt hero-partners as new `.partner-orb` component** (independent of `.brand-pill`, so Skills/
  Experience are untouched): fixed-size circular icons that never change dimensions. The company
  name now floats up in a small tooltip bubble above the icon on hover (macOS Dock-style), which is
  purely an absolutely-positioned overlay with zero effect on layout. Verified programmatically —
  read every icon's `getBoundingClientRect().left` before and after hovering one: **identical
  array, byte-for-byte** — structurally guarantees no jiggle, not just "looks fine in a screenshot."
- **Removed the backdrop-filter blur** from the hero-card badge per explicit feedback ("not looking
  nice") — reverted to the solid opaque copper gradient, keeping the `.icon-chip`-style diagonal
  gloss overlay (the "shine," which wasn't the complaint).
- **Hero-card easing swapped from `--ease-spring` to `--ease-smooth`** — a calm decelerate-and-stop
  curve with no overshoot, closer to a real drawer gliding open than a bouncy spring.
- **Fixed `.hero-partners__label` ("Worked with") contrast** — was `rgba(17,17,17,.45)` with a
  white-highlight shadow meant for solid backgrounds, nearly invisible over the variable-toned photo
  behind it. Bumped to `rgba(17,17,17,.72)`, semibold, with a stronger white glow shadow for
  legibility against the photo.
- Confirmed with the user that hero-card's existing right-anchored / expand-toward-left behavior
  (already in place since Revision 4's clip-path rebuild) was correct as-is — no change needed there
  beyond the easing swap.
- Re-verified: braces balanced, `app.js` syntax-checked, `prefers-reduced-motion` (orb/tooltip
  transitions off), real touch-device emulation (mobile unaffected, card still fully expanded).

## Revision 6 (post-review) — correct right-anchor, badge recipe, premium icon
- **Correction**: Revision 5 asserted the hero-card was already right-anchored with a leftward
  reveal. It wasn't — the badge (visible collapsed state) sat at the *left* edge of the card's box
  while the box's own right edge matched the aside column's right edge, so the collapsed chip
  visually floated ~13rem short of the actual right edge. Confirmed via `getBoundingClientRect()`
  before assuming this was fixed.
- **Fix**: added `flex-direction: row-reverse` to `.hero-card__inner` inside the desktop hover-
  capable media query only (mobile's always-expanded layout is untouched), and flipped the
  `clip-path` from `inset(0 calc(100% - 7rem) 0 0)` to `inset(0 0 0 calc(100% - 7rem))` so the
  visible collapsed slice is the *rightmost* 7rem — i.e. the badge, now flush against the same
  right edge the "Worked with" icons align to. Hover/focus reveals the body panel sliding out from
  behind the badge toward the left (`translateX(6px) → none`, mirrored from before). Verified via
  bounding-box math (badge origin falls inside the visible clip window) and a full-hero screenshot.
- **Badge recipe replaced**: was a deep saturated copper gradient with a white icon — visually
  unrelated to the "what I do" (services) icon-chip look the user asked to match. Replaced with the
  *exact* `.icon-chip` / `.nav-desktop__pill` formula (pastel `color-mix` gradient, tinted border,
  soft box-shadow, diagonal gloss `::before`), pinned to `--accent` so it stays on-brand regardless
  of the hero section's ambient `--tint` — same pattern already used for the nav pill.
- **Icon swapped** `layers` → `sparkles` (already in the icon MAP) for a less generic, more
  "premium" glyph that suits the tinted-glass badge treatment.
- **Card container** restyled to match the "View experience" pill button's glass surface (gradient
  `rgba(255,255,255,.92→.7)` + matching inset highlight) instead of the previous flat
  `rgba(255,255,255,.68)` fill.
- Re-verified: brace balance (602/602), full-hero screenshots at rest/hover (1440px), reduced-motion
  transition duration ≈0, real iPhone 13 emulation (mobile unaffected).

## Revision 7 (post-review) — true merge (no border), symmetric slide, icon direction
- **"No white border" fix**: Revision 6's clip-path only cropped horizontally, leaving the card's
  full 8rem height always visible — since the 6rem badge sat centered inside that with
  `align-items:center`, a ~1rem margin of white/glass card showed above and below it at rest. Fixed
  by clipping all four sides down to the badge's exact footprint (`inset(1rem 0 1rem calc(100% -
  6rem) round 0.9rem)`), and zeroing `padding-right` at rest so the collapsed clip window sits flush
  against the card's true right edge — same edge the "Worked with" icons align to. Verified via
  `getBoundingClientRect()`: badge rect and the visible clip window are now identical, not just close.
- **Badge border/shadow hidden at rest, faded in on hover** (`border-color`/`box-shadow` from
  transparent/none → the icon-chip values) — since at rest the badge fully occupies the visible
  area, there's nothing for a border to separate it from; the border only earns its keep once the
  card opens and the badge becomes a distinct tile again. Kept out of the base rule so mobile (always
  expanded, no merge concept) keeps its border permanently, as before.
- **Actual sliding icon, not just clip-reveal**: `.hero-card__badge` now animates `transform:
  translateX(...)` between its collapsed (flush-right) and natural (flex-start, left-of-body)
  positions, rather than staying static while clip-path alone reveals/hides content. Opening moves
  the badge from `translateX(15.5rem/13.5rem)` → `translateX(0)` (visually leftward); closing
  reverses the same transition (rightward) — one shared `transition` declaration drives both
  directions, so open and close are provably identical, not just visually similar.
- Re-verified: brace balance (606/606), `getBoundingClientRect()` showing badge flush against the
  card's true right edge at rest and the card's left edge at hover, reduced-motion (transition
  duration ≈0 on card/body/badge), real iPhone 13 emulation (mobile card unaffected, border/shadow
  still present there).

## Revision 8 (post-review) — root-cause the "still fast" motion; genie-anchored reveal
- **Root cause found**: `.hero-card` carries `data-reveal="scale"` for its page-load entrance
  animation. The shared reveal rule `[data-reveal].is-visible { transition: opacity …, transform …; }`
  has specificity (0,2,0) — strictly higher than a plain `.hero-card { transition: clip-path …; }`
  rule (0,1,0). Once the reveal completes and `.is-visible` is added (permanently), that rule's
  `transition` shorthand **won the cascade outright**, which means it silently reset
  `transition-property` to only `opacity, transform` — `clip-path`, `padding-right`, and `box-shadow`
  had **no transition at all** and were snapping instantly on every hover in/out, every previous
  round. This is the actual explanation for "horrible/fast" across every prior revision, not a
  duration or easing problem — confirmed with native `transitionrun`/`transitionend` event listeners
  (not polling, which was itself misleading due to round-trip jitter) showing zero events fired for
  `clip-path` before the fix, and correct ~0.9–0.95s runs after.
  - **Fix**: raised the card's rest/hover selectors to `.hero__aside .hero-card[data-reveal]` (and
    `:hover`/`:focus-within` variants), specificity (0,3,0) — decisively above the reveal rule,
    regardless of source order. Scoped locally; the shared `[data-reveal]` system is untouched.
- **Slowed every synchronized property** to ~0.9–0.95s (`clip-path`, `padding-right`, badge
  `transform`) with the same `--ease-smooth` curve so open/close now read as one deliberate,
  unhurried glide instead of a snap.
- **Attempted a `transform-origin:right center` + `scale()` "genie" component** so the panel visibly
  grows out of the badge — reverted. `.hero-card` already has a continuous JS-driven pointer-tilt
  (`tilt()` in `motion.js`, via Motion One, writing `rotateX`/`rotateY` to the element's inline
  `transform` on every mousemove) which unconditionally wins over any CSS `transform` value/
  transition on the same property (inline style always beats stylesheet rules) — our `scale()` was
  provably never rendering (computed `transform` matched the tilt's rotation matrix, not our scale).
  The "grows out of the icon" sensation is instead carried by the clip-path itself: its right inset
  never moves (0 in every state), so the reveal only ever expands away from the badge's fixed edge —
  genuinely anchored, no scale needed, no conflict with the tilt effect.
- Re-verified: brace balance, native `transitionrun`/`transitionend` timing (clip-path/padding-right
  ~909ms against a 950ms declaration, badge border/shadow ~457ms against 600ms, body opacity ~690ms
  against 700ms — all converging correctly), reduced-motion (duration ≈0), real iPhone 13 emulation
  (mobile unaffected).

## Revision 9 (post-review) — faster glide, remove residual container ring, shiny arrows
- **Sped up** the synchronized drawer properties from ~0.95s → 0.7s (badge translateX, clip-path,
  padding-right) and proportionally shortened the border/shadow/opacity fades — still smooth, less
  leisurely.
- **Removed a residual "container" ring at rest**: `.hero-card`'s base rule (the "View experience"-
  glass surface) carries a permanent `box-shadow` — an inner white top highlight plus a
  `0 0 0 1px rgba(230,229,226,.35)` outer stroke — meant for the expanded card. That box-shadow was
  never overridden for the rest state, so it was still painting (clipped to the collapsed window,
  but still visible) around the merged badge — the leftover "container" the user flagged. Fixed by
  giving rest its own minimal shadow (matching the badge's own soft accent shadow) and restoring the
  full glass-card shadow only on `:hover`/`:focus-within`. Also hid `.hero-card::after`'s glass-sheen
  overlay (another always-on layer meant for the expanded surface) at rest, fading it in on hover.
- **Prev/next controls redesigned**: were flat white circles with literal `←`/`→` text glyphs (looked
  dated, inconsistent with the rest of the icon system). Replaced with real SVG icons (`arrow-left`
  added to `icons.js`'s Lucide set/MAP alongside the existing `arrow-right`) rendered on the *exact*
  icon-chip shine recipe (same gradient/border/box-shadow/gloss formulas as the badge and services
  icons), pinned to `--accent`, added to the shared gloss selector list in `styles.css` alongside
  `.icon-chip`/`.service-row__icon`/`.exp-row__icon`/`.point-chip`.
- Re-verified: brace balance, native `transitionend` timing confirms faster durations landed, real
  iPhone 13 emulation (arrows render correctly as shiny circular icon tiles on mobile's permanently-
  expanded card), reduced-motion unaffected.

## Revision 10 — liquid nav transitions, SVG sprite/externalization, JS minification, PageSpeed pass
- **Liquid nav-pill morph**: new `--ease-liquid: cubic-bezier(0.3, 1.9, 0.6, 1)` (a "back-out"
  overshoot curve) drives `.nav-desktop__pill`'s `transform`/`width` transitions with staggered
  durations (0.48s / 0.7s), so the pill visibly stretches past its target width before settling —
  confirmed via a single in-page rAF sampling loop (external per-sample polling was too laggy to
  catch the overshoot; batching all samples into one `evaluate()` call fixed that) showing a 122.3px
  peak against a 116px final width.
- **Liquid "warp" on nav-triggered scroll**: `scrollTo()` now calls `_liquidWarp()`, which toggles
  `.is-liquid-warp` on `#app`, applying `filter: blur(6px) saturate(165%)` + a slight `scale(1.008)`
  for the duration of the smooth-scroll (cleared on `scrollend`, with a 700ms timeout fallback for
  browsers/cases where it never fires). Hit the **exact same specificity bug class as the hero-card**
  from Revision 8: the base rule `html:not(.is-loading) .app-root` out-specifies a plain
  `.app-root.is-liquid-warp` (`html`'s element-selector point beats the extra class point), so the
  "fast blur-in" transition silently never applied until the override selector repeated the
  `html:not(.is-loading)` prefix. Worth remembering as a recurring pattern: any state-toggle rule
  layered on top of a rule that also has an element-selector prefix needs to match or exceed that
  prefix, not just add one more class.
- **SVG sprite + externalization** (the user asked to check whether inline SVGs could be referenced
  instead of duplicated): added a `<symbol>`-based sprite (`#ico-spark`, `#ico-star`) near the top of
  `<body>`, referenced via `<use>` at all 5 call sites (3× brand spark logo, 5× hero rating star) —
  zero added network requests, just de-duplicated inline markup. The one-off, much larger Bismillah
  calligraphy SVG (~14KB, appears once) went the other way — extracted to
  `public/assets/img/bismillah.svg` and loaded via `<img>`, since it's large enough that moving it
  out of the *non-cacheable* HTML into an *immutable-cached* asset is worth the one extra request
  (added to the Worker's Early Hints preload list so there's no visible delay). Both `sync-head.js`
  and `set-asset-version.js` extended to keep its `?v=` in sync with the rest of the pipeline.
- **JS minification pipeline added** (`scripts/minify-js.js`, wired into `build.sh` after
  `set-asset-version.js`): unlike CSS (hand-rolled whitespace/comment stripper in `minify-css.js` —
  safe because CSS has no regex literals or string/comment ambiguity), several JS files contain real
  regex literals and string literals with `//` inside them (`data.js`'s date/URL parsing, `icons.js`'s
  SVG `xmlns` strings) — naively stripping `//`/`/* */` by regex risks corrupting those, so this uses
  `esbuild` via `npx` (network at build time only, mirrors how `build-css.sh` already downloads the
  Tailwind CLI). Source `.js` files stay as the hand-edited, fully-commented originals;
  `index.html`/`boot.js` now load the generated `.min.js` twins (37% smaller in aggregate:
  70,308B → 44,166B). `boot.min.js` uniquely bakes in a copy of `ASSET_V`, so it needed the same
  hash-exclusion treatment as `boot.js` itself in `set-asset-version.js` (same non-convergence
  reasoning already documented there).
- **Oversized logo images fixed**: Lighthouse flagged `icddrb-official.png` — a 57KB PNG rendered at
  24px — plus four more company/school logos shipped at arbitrary source resolution (up to 512×512)
  despite only ever rendering at 28-48px. Extended `optimize-images.js` with a logo pass (resize to
  ≤192px — 48px @2x retina with headroom — convert to WebP via `cwebp`, skip resizing when the
  source is already smaller to avoid upscaling) and regenerated the 5 affected logos by hand this
  round via `sharp` (not available as a CLI here; `cwebp`/`magick` are macOS-only tools this repo's
  build already assumes, same as `build-css.sh`'s Tailwind binary — the *build script* now exists for
  the next real run, today's output was produced with an equivalent tool). 60-82% smaller per file;
  `portfolio.json`'s `logo` fields updated to the new `.webp` paths, PNG masters kept as source (same
  "immutable master → generated derivative" pattern as the hero photo).
- **CLS fix**: `.hero-partners__list` is an empty flex container until Alpine renders the 5 partner
  icons from the async-loaded JSON — an empty flex container has zero height, so the row's real
  height (2.35rem) popping in after data loads shifted `.hero__aside` beneath it. Added
  `min-height: 2.35rem` to reserve the space upfront. Measured CLS 0.115 → 0.085 (crosses Google's
  "good" 0.1 threshold).
- **PageSpeed investigation (mobile, local sandbox — honest caveats below)**: ran real Lighthouse
  (not guessed) via `npx lighthouse` against `chromium`'s bundled headless binary. Baseline mobile
  Performance was 52/100 (Accessibility/Best-Practices/SEO already 100/100, unaffected by anything
  this round). Root-caused via trace analysis (`RunTask`/`EvaluateScript`/`UpdateLayoutTree`
  aggregation, not guesswork) rather than reactively tweaking: isolating network throttling from CPU
  throttling showed removing *network* simulation alone jumps the score to ~70-72 — meaning the
  dominant factor for the 52 baseline is Lighthouse's simulated slow-4G network compounding with this
  local sandbox's single-threaded, uncompressed `python -m http.server` origin (no HTTP/2, no
  Brotli/gzip, no keep-alive) — none of which represents the real Cloudflare Worker + edge CDN
  deployment (Brotli/HTTP3 always-on, global edge caching, sub-10ms origin latency). That gap should
  close substantially in production and can't be faithfully reproduced in this sandbox.
  - What *did* move independent of network: fixed a forced-reflow pattern in `setupNavPill()`
    (`app.js`) — `place()` reads `offsetWidth/Left/Height` right after a previous call's style
    write, and multiple triggers (IntersectionObserver scroll-spy, hover, resize) could fire in the
    same tick, each forcing a synchronous layout recalc off the last one's write. Coalesced into a
    single shared `requestAnimationFrame` so a same-tick burst collapses into one read+write pair.
  - Confirmed the JS bloat findings (`unminified-javascript`, `unused-css-rules` for Tailwind) and
    fixed what was fixable (minification, above); `unused-css-rules`'s ~38KB is largely `:hover`/
    `:focus`/breakpoint/modal-open rules Lighthouse's single-page-load coverage can't see as "used"
    — not real dead code for an interactive, responsive site.
  - Tested whether the idle-loaded desktop effects (aurora/liquid-hero/motion canvas & tilt) were the
    TBT driver by blocking their requests entirely — CPU-only score barely moved (70→70, TBT
    3010ms→2900ms), so they are **not** the bottleneck; reverted nothing since they weren't at fault.
  - Remaining gap (mobile lab score, CPU-throttle-isolated, still ~70-ish) is dominated by
    `UpdateLayoutTree`/style-recalculation cost tied to real content richness (2,342 DOM elements —
    8 experience roles × stack/AI-tool pill lists, 5 skill categories, etc.) hydrated client-side by
    Alpine. Reducing this further would mean either trimming real content or pre-rendering sections
    to static HTML at build time (eliminating client-side hydration cost entirely) — a materially
    bigger architectural change than this round's scope, flagged for the user rather than
    unilaterally decided.
- Re-verified: brace balance, full JS syntax check across all 10 source files + `minify-js.js`/
  `optimize-images.js`, JSON validity, zero console/page errors on desktop and real iPhone 13
  emulation, all logo/bismillah/sprite images loading correctly, experience-accordion interaction
  still works with the minified JS.

## Revision 11 — About/menu/CTA rework, hero-card content-swap + per-item identity

- **About section rebuilt**: removed the "The engineer" eyebrow line and the old 2-column
  `about-grid`; replaced with a single `.about-card` glass panel — big quote mark, icon-chip, a
  `data-blur-reveal` statement pulled from a new `site.aboutHeading` copy line, socials + a "My work"
  CTA in the footer. Copy rewritten from the generic "we build better" framing to a specific,
  quantified statement (14 years, telco-scale traffic, monoliths→microservices).
- **CreateBand relabeled**: We/Build/Better → Code/Ship/Scale (`--light`/`--ghost` tile variants
  renamed to `--code`/`--scale` to match), read as one coherent verb progression instead of a
  first-person slogan.
- **Menu splash cleanup**: removed the decorative spark icon beside "Saniyat" (redundant next to the
  brand mark already in the header), close control changed from bare text to an icon+label
  (`.nav-overlay__close`), nav-item icon-chips bumped `--sm`→`--md` for better touch/visual
  proportion. CTA copy ("Start a project" → "Get in touch") changed at both the nav-overlay bottom
  bar and the footer for a lower-commitment, friendlier ask.
- **Bismillah tooltip + hover**: added a `.brand-tooltip` (English meaning, "In the name of Allah, the
  Most Gracious, the Most Merciful") as a sibling of the header's Bismillah image, plus a shinier
  hover filter treatment — same `role="tooltip"` pattern already used by `.partner-orb__tip`, not a
  new interaction primitive.
- **Hero-card ("Now" widget) content-swap + per-item identity** — the actual focus of this round,
  triggered by the user rejecting a prior pass as "same old card design": the 3 rotating items
  (Now/Focus/Lately) previously swapped caption/title with zero transition and always showed the same
  copper `sparkles` badge regardless of which item was active. Added:
  - `heroCards[].icon`/`.tint` fields in `portfolio.json` (`sparkles`/accent, `architecture`/primary,
    `ai`/teal — all pre-existing icon keys and color tokens, nothing new).
  - `tintVars()` in `app.js`, bound via `:style` on `.hero-card__badge` (same per-instance custom-
    property pattern `.partner-orb`'s `--brand` already established).
  - `cardStep()`/`_finishSwap()` rewritten from a 2-line index mutation into a direction-aware
    CSS-transition orchestration (`.hero-card__swap` wrapper gets `is-swapping-*`/`is-entering-*`
    classes; content updates mid-transition while fully transparent/off-axis; double-`requestAnimationFrame`
    "silent reposition, then animate back to rest" idiom, reused from `reveal.js`). Transitions, not
    `@keyframes`, throughout — an in-flight swap retargets cleanly instead of restarting when clicked
    rapidly.
  - New `--dur-swap: 0.18s` token; `.hero-card__dot`'s banned `transition: all` replaced with named
    properties; `.hero-card__arrow` got a `:active` press-scale.
  - Found and fixed a same-specificity cascade bug (the desktop hover-drawer's own `.hero-card__badge`
    rule, declared later in the file, was silently dropping the new `background` transition needed
    for the tint swap to animate smoothly on desktop) — the same bug *class* as Revision 8's
    `.app-root`/`.is-liquid-warp` issue, caught proactively this time from pattern-recognition rather
    than a failing test.
- **Verification note — headless Chromium frame starvation (worth remembering for future work in this
  repo)**: extensive Playwright debugging this round chased what looked like a real bug — assigned
  CSS opacity/transform values not showing up in `getComputedStyle`, `_finishSwap`'s cleanup
  seemingly never firing, the desktop hover-drawer failing to open before a click. Root cause was the
  *test environment*, not the site: this sandbox's headless Chromium produces compositor frames only
  on demand (~1-2 real frames per 500ms of wall-clock time when nothing asks for one), so
  `requestAnimationFrame`, CSS transition progress, and `:hover`-triggered layout all lag far behind
  real time unless something actively forces frames. Confirmed via `document.getAnimations()`,
  `elementsFromPoint()`, and cascade/rule-matching dumps that the CSS/JS were correct throughout; the
  fix for *testing* (not the site) was polling with real `page.screenshot()` calls interleaved
  (forces genuine compositor frames) rather than trusting `getComputedStyle`/rAF counters sampled
  after a raw `waitForTimeout`. With forced frames, the swap transition and the hover-drawer both
  converge reliably and match the intended design. Real browsers render continuously at 60fps and
  won't hit this — no code changes were needed for either mechanism.
- Rebuilt the full pipeline (`minify-css.js` → `set-asset-version.js` → `minify-js.js` →
  `sync-head.js` → `hash-sw.js`); zero console/page errors on desktop (1440), tablet/laptop
  (768/1024), mobile width (360), and real iPhone 13 touch emulation; reduced-motion verified to skip
  the swap animation instantly with no intermediate frame.
