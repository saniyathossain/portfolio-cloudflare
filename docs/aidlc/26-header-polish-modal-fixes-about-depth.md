# 26 — Header polish, CTA/modal shine, star cleanup, About layered depth

Follow-up round fixing specific issues found after the color/typography/menu-stagger round shipped,
plus two more "pick from real options" decisions (partner colors were revisited once more, About
section composition chosen fresh).

## Bugs found and fixed

1. **Clock hover trigger was the whole `.clock-chip`, not the analog face.** Hovering the digital
   time/date text also popped the clock open. Rescoped `.clock-chip:hover .clock-face` →
   `.clock-face:hover` (and its `::before`/`.clock-tick` companions) so only the analog face itself
   triggers the enlarge.
2. **Investigated a reported "menu not middle aligned" issue at length and could not reproduce it**:
   measured the header's brand/nav/clock/menu-button vertical centers (identical to sub-pixel
   precision), the open nav-overlay's content centering (exactly equal space above/below), and found
   one genuine layout quirk at 768-1023px (`.nav-desktop` hidden below 1024px while `.clock-chip`
   already shows at 768px+, leaving a big gap) — but confirmed via computed styles that a
   `margin-left: auto` "fix" was a no-op, since `justify-content: space-between` with exactly two
   flex items already produces the same edge-to-edge result. Reverted that non-fix rather than ship
   dead CSS. Flagged for the user rather than continuing to guess blindly.
3. **`.pill-btn-dark`/`.pill-btn-glass` (Get in touch / View experience) and `.menu-btn` gained the
   icon-chip "shiny tile" gradient + diagonal gloss recipe** — `.beam` already claims `::before` on
   these buttons for its rotating conic border, so the new gloss uses `::after` instead to avoid a
   pseudo-element collision, with the direct children promoted to `z-index: 2` to stay above it.
   `.menu-btn` went from flat `var(--ink)` to a graphite `linear-gradient` + inset highlight + gloss —
   "shiny but black" per the request, matching the nav-pill's polish without introducing a color.
4. **Removed the 5-star rating from the hero and the spark icon from the loader** (kept the "14+
   years..." rating text and the loader's brand name/tagline — only the icons went). Cleaned up now-
   orphaned CSS (`.hero-stars` base + on-dark variant, `.loader__brand svg`) and the now-unused
   `#ico-star` sprite symbol (`#ico-spark` stays — still used by the footer brand mark).
5. **Contact modal**: the footer row (disclaimer text + submit button) used bare Tailwind flex
   utilities that let the button's own label wrap mid-word ("Send" / "request" on two lines) once the
   row got tight on narrow screens. Replaced with a dedicated `.modal-footer-row` that stacks
   vertical-then-horizontal at a 420px breakpoint and pins `white-space: nowrap` on the button
   regardless. Added icons to all three field labels (Name/Email/Project) and to the submit button
   itself (restructured off a bare `x-text` button — which structurally can't also hold an icon span,
   since `x-text` replaces all children — onto the same `<span x-text>` + `.pill-btn__icon` pattern
   the hero's own CTA already uses). Modal panel gained the same shiny-tile gloss via `::before`.
6. **Bismillah shine**: added a specular sweep masked to the calligraphy's own silhouette (not a
   rectangle) — `mask-image` referencing the same SVG file, so the moving highlight is clipped to
   exactly the drawn strokes, reading as light glinting off engraved metal rather than a generic
   shine bar sliding over a box. Required wrapping the bare `<img>` in a `.brand-bismillah-wrap` span
   to host the `::after` overlay; verified the sweep's actual motion via forced-frame screenshot
   bursts (a single freeze-frame doesn't show it moving, matching this session's established "force
   real compositor frames" testing lesson) — confirmed the highlight visibly travels left-to-right
   across 3 sampled frames.

## Re-picked via real options (not more guessing)

- **Partner colors, again**: the previous hue-distance-math palette was distinct but still felt
  "off vibe." Chose monochrome (all 5 orbs share `--muted`, `#8d8d8d`, differentiated by logo only) —
  see revision in doc 25 for the full backstory; this round just executed the user's pick.
- **About section composition**: rendered 3 real layout options (stat-accented split reusing real
  `stats` data, layered-depth card, full-bleed editorial) and let the user choose — picked **layered
  depth**: a tinted `.about-card__backdrop` panel peeks out from behind the main card via `z-index:
  -1`, both slightly counter-rotated (±0.6-1.2deg) for a stacked, physical feel.
  - **Caught two transform-collision cascade bugs while wiring this up**, the same bug class this
    session keeps finding: `.glass-card`'s own `transform: translateZ(0)` (needed for the stacking
    context the backdrop's negative z-index depends on) would have been silently replaced — not
    merged — by `.about-card`'s new `rotate(-0.6deg)` (same specificity, declared later) and again by
    `.glass-card:hover`'s `translateY(-3px)` (higher specificity via `:hover`). Fixed both by chaining
    the transform functions explicitly (`translateZ(0) rotate(-0.6deg)`, and a dedicated
    `.about-card.glass-card:hover` override chaining all three) rather than letting either rule
    clobber the other.

## Verification

Zero console/page errors across 360/768/1024/1440 and `reducedMotion: 'reduce'`. Clock hover scope
verified via computed `transform` (none on date hover, `scale(1.9)` on face hover). About-card hover
transform verified via computed matrix to confirm rotation + translateZ + hover-lift all survive
together. Modal footer row verified at both desktop and 390px mobile — button text never wraps.
Bismillah sweep verified moving across multiple high-DPI forced-frame screenshots, not just a single
static capture. Full pipeline rebuilt after every change.
