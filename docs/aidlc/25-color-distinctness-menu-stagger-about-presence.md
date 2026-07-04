# 25 — Color distinctness fix, menu stagger/morph, About card presence

User feedback that triggered this round (direct quote): two prior rounds of visual work were judged
"you did absolutely NOTHING" — real code had shipped, but the delta was imperceptible. Root-caused via
fresh screenshots (not assumptions) rather than re-explaining prior work: two of the "identity" fixes
technically existed in code but were visually indistinguishable, and the menu/About sections had real
content but no dynamic treatment. This round fixes exactly those three things, using only mechanisms
and color tokens that already existed in the codebase.

## 1. Color palette — the core, measurable bug

Hero-card badge tints (`tintVars()` in `app.js`) and partner-orb colors (`brandColors` in `data.js`)
were both **hue-clustered**, verified by direct computation, not eyeballing:
- Hero-card: `primary` (azure `#2f9fd6`, H≈200°) and `teal` (sea `#2b8c9a`, H≈188°) sit 12° apart —
  they render as near-identical pale-blue badges. Screenshots confirmed only the copper `accent`
  tint read as visually distinct across the 3 rotating states.
- Partner row: Brain Station 23 (`#0088cc`) and Grameenphone (`#0ea5e9`) sit 1.4° apart; icddr,b
  (`#be123c`) and Runner Cyberlink (`#dc2626`) sit 14.7° apart. 2 of 5 "different" company colors
  were blue, 2 were red — only Optimum Solution's teal read as distinct.

Fix: reassigned to the codebase's own existing "Aurora" hue palette (`--c-violet`, `--c-teal`,
`--c-green`, `--c-rose`, already defined in `:root` for `[data-ci]` section tinting, previously unused
by either the hero-card or partner system) — copper/violet/green for the hero-card (106°+ apart
pairwise, up from 12°), and violet/copper/teal/rose/green for the 5 partners, ordered so *adjacent*
circles in the rendered row are maximally distinct (142° adjacent-gap, up from 1.4-14.7°). Zero new
hex values — every color is a token that already existed for a different purpose. Confirmed via
screenshot: all 3 hero-card states and all 5 partner circles are now unmistakably distinct at a glance.

## 2. Menu overlay — stagger entrance + hamburger→X morph

Previously: `.nav-overlay` was a single whole-element opacity fade, zero stagger between items, and
the header's hamburger icon never changed state. Added:
- Per-item stagger via `--stagger-i` (set inline through Alpine `:style` in the `x-for` loop — same
  custom-property idiom `.partner-orb` already uses for `--brand`), driving a `transition-delay:
  calc(var(--stagger-i, 0) * 45ms)` on each `.nav-overlay__item`'s entrance.
- Hamburger→X morph on the header's `.menu-btn`: replaced the static SVG icon with 3 plain
  `<span>` bars, keyed off `:aria-expanded` (same CSS-state-hook convention already used for the
  experience accordion) — top/bottom bars rotate into an X, middle bar fades, transform/opacity only.
- Made the header button an actual toggle (`menuOpen ? closeMenu() : openMenu()`) — it previously only
  ever called `openMenu()`, which would have made the new "Close" morph state a dead, non-functional
  control once added.

**Found and reverted a real regression during verification, not assumed away**: the plan called for
removing the bare `x-transition` attribute from `.nav-overlay` (reasoning: it looked like a redundant
fight with the hand-written CSS opacity transition on the same property). Empirical Playwright testing
—sampling computed `display`/`opacity` frame-by-frame through the close transition—showed this made
`x-show` hide the element **instantly** (`display:none` within ~60ms, no visible fade at all).
Restored `x-transition`, then A/B-tested against the pre-session original code and found **the
identical instant-snap-on-close behavior already existed before any of this session's edits** — this
is a pre-existing Alpine/precompiled-Tailwind interaction issue (Alpine's default transition-wait
mechanism doesn't appear to pick up hand-authored CSS transitions the way plain `x-show` timing
requires), not a regression, and not what the user asked to fix (their complaint was specifically
about the *open* experience feeling inert, which is now fixed and verified — the open fade is
genuinely visible frame-by-frame, unlike close). Documented rather than silently patched around, since
a real fix would mean introducing a transient "closing" state into the Alpine component — a bigger,
separate change than this task's scope.

## 3. About card — key-phrase emphasis, cursor spotlight, globe path-draw

Card had specific, non-generic copy but read as sparse (~half the card empty on desktop, zero dynamic
treatment). Three additive changes, no content rewrite:
- **Key-phrase highlighting**: extended `blur-reveal.js`'s `splitWords()` with an optional
  `data-blur-highlight="phrase one|phrase two"` attribute — plain-text phrase matching against the
  already-tokenized words (never `innerHTML`, preserves the existing "content is never parsed as
  markup" safety property). Applied to the About statement, highlighting "telco-scale" and "quiet
  precision" (verbatim from the existing copy) in the section's own `--tint-deep` ink at bold weight.
  Caught and fixed a real matching bug before it shipped: "precision." carries a trailing period after
  word-tokenization, which a naive exact-match would miss — the matcher now strips leading/trailing
  punctuation for comparison only, never for what's displayed.
- **Cursor-tracking spotlight**: added the `spec spec--panel` classes already used by `.stats-panel`
  (driven by `motion.js`'s existing global pointermove listener — zero new JS), with a tint-colored
  override since `.about-card` is a light surface (the default white glow `.stats-panel` uses would be
  invisible here). Caught a real stacking bug before shipping: `.spec::after`'s pseudo-element uses
  `z-index:3`, but `.about-card`'s own text content was at `z-index:1` — without a fix, the colored
  glow would have painted *over* the readable statement text on hover. Bumped the card's content
  elements to `z-index:4`, safe because `.glass-card`'s `transform: translateZ(0)` already creates a
  private stacking context, so the change can't affect anything outside the card.
- **Globe path-draw**: the existing globe SVG watermark already occupied the empty zone; made its
  outline draw itself in once via the classic `stroke-dasharray`/`stroke-dashoffset` technique,
  triggered by the *existing* `[data-reveal]` IntersectionObserver (zero new JS, zero new trigger).

## Verification

Static: `node --check` on all edited JS, CSS brace-balance (658/658, matched). Playwright, forcing
real compositor frames via interleaved `screenshot()` calls throughout (not blind `waitForTimeout` —
this sandbox's headless Chromium under-produces frames on demand, the same lesson from the hero-card
round applies here): all 3 hero-card tints and all 5 partner colors confirmed visually distinct;
hamburger morph confirmed (`aria-expanded`/text toggle correct); all 5 nav items confirmed reaching
full opacity; highlighted words confirmed matching including the punctuation edge case;
`prefers-reduced-motion` confirmed instant for menu stagger, hamburger bars, and globe draw. Zero
console/page errors at 360/768/1440. Bundle delta: `app.min.js` +154B, `styles.min.css` ≈+2KB,
`blur-reveal.min.js` +468B — all additive CSS/JS, no new assets, no new network requests.
