# 27 — Graphite single-accent, About "Bleed Statement", frosted-glass menu

Follow-up round: two more real regressions found and fixed, a genuine full-screen frosted-glass
material added, and two more "pick from real options" decisions — this time backed by three parallel
research agents (reference sites, verified Apple system colors, and this project's own design-taste
skill corpus) rather than the assistant's own guesses.

## Bugs found and fixed

1. **"Get in touch" rendered with a blank/white background.** Root cause: `.pill-btn-dark`/
   `.pill-btn-glass` paint their own color via the `background` *shorthand* (which sets the
   `background-image` sub-property too), and `.sheen`'s bare `background-image` — equal specificity,
   declared later in the file — was fully replacing that gradient instead of layering over it. This
   is the exact same collision already caught and fixed once for `.hero-card.sheen` (a comment right
   next to the bug even documents the fix pattern) — just missed for the CTA buttons when they gained
   their own gradient in the previous round. Fixed with `.pill-btn-dark.sheen`/`.pill-btn-glass.sheen`
   overrides that layer both gradients as two `background-image` values; two-class selectors also
   outrank both single-class rules on specificity, not just source order, so the fix holds regardless
   of future reordering.
2. **Menu button icon measurably off-center** (not the previous round's unreproducible "menu not
   aligned" report — this one is real and different). Measured via Playwright at all four
   breakpoints: the icon+label group sat 2.4-3.0px below the button's true vertical center every
   time, not a rounding artifact. Root cause: `.menu-btn` never declared `display:flex`/
   `align-items:center` on *itself* — only its inner wrapper span did — so the browser fell back to
   inline baseline alignment for the button's single child instead of true geometric centering.
   `.pill-btn-dark`/`.pill-btn-glass` already do this correctly (declare flex+center directly on the
   button); `.menu-btn` was the one control that got missed. Fixed by adding
   `display: inline-flex; align-items: center; justify-content: center;` to `.menu-btn` itself —
   confirmed 0.00px offset at all four breakpoints after the fix.

## Frosted Liquid Glass menu overlay

`.nav-overlay` was a flat `background: var(--ink)` — solid, no material. Replaced with a translucent
tint + `backdrop-filter: blur(32px) saturate(170%)` (plus `-webkit-backdrop-filter`), so the section
you were scrolled to shows through, blurred and saturated, exactly like the `.modal-backdrop` this
site already ships (same mechanism, deeper blur since this covers the full viewport instead of
sitting behind a white panel). The tint alpha alone (`color-mix(in srgb, var(--ink) 72%, transparent)`)
stays dark enough to keep white nav text legible even without `backdrop-filter` support. A soft radial
highlight is a second `background` layer, not a separate pseudo-element, specifically so it can't
collide with or need z-index above the nav items — same "combine layers, don't add pseudo-elements
that need stacking-order bookkeeping" instinct as the sheen fix above.

## Research — three parallel agents, not solo guessing

Per explicit instruction to "use multiple agents," three research agents ran in parallel:

1. **Reference re-analysis** (animmasterlib.dev, skiper-ui.com, vengenceui.com, 2 Instagram reels) —
   most were paywalled/inaccessible for real technique extraction (confirmed, not assumed); the
   Instagram reels are video-production marketing content, not UI captures, matching the prior
   round's conclusion. vengenceui.com's actual component pages were the one productive source: a
   verified `backdrop-filter: blur(20px) saturate(180%)` glass-dock recipe, and an explicit
   3-1-2-span bento-grid pattern for asymmetric card layouts.
2. **macOS Tahoe / Liquid Glass system colors** — fetched Apple's own WWDC25 session transcripts
   directly (not third-party summaries) and cross-verified all 12 system-color hex values against
   3+ independent sources each. Key finding: Apple's own material description centers on "Lensing" —
   dynamically bending/concentrating light, not just blurring — and Tahoe's own accent-color picker
   is explicitly **single-color** (Blue/Purple/Pink/Red/Orange/Yellow/Green/**Graphite**), not a
   multi-hue palette.
3. **This project's own design-taste skills**, read fresh against the current markup — independently
   confirmed the single-accent finding ("one locked accent, <80% saturation" appears near-verbatim
   in `design-taste-frontend`, `high-end-visual-design`, `minimalist-ui`, and `redesign-existing-projects`),
   flagged the About section's globe as a literal-metaphor cliché to not backfill with another icon,
   named "split-header" (left headline / right caption) as a banned shape, and pushed toward genuine
   asymmetry over another centered card.

## Picked via real options

Built actual rendered variants (temporary runtime overrides + Playwright screenshots, never touching
source until picked) rather than reasoning to another guess:

- **Color — 3 single-accent options** (Graphite / Indigo `#5856D6` / Teal), each applied to the real
  hero name + CTA glow ring. **Graphite won** — full monochrome, no hue anywhere in the core accent
  system. `--accent`/`--accent-bright`/`--accent-dark` and `--primary`/`--primary-deep` (which drives
  the root default `--tint`) were reassigned; `--beige` (eyebrow dot) and the `[data-ci]` per-section
  hue map (Skills/Education/About's own teal wash) were deliberately left untouched — those weren't
  part of what was rendered/approved, and touching them would have been unrequested scope creep.
  Confirmed via screenshot that Skills' rotating blue/teal/purple/orange/cyan panels are unaffected.
- **About section — 3 structural options**, globe removed in all three: "Bleed Statement" (asymmetric
  card + bled quote/icon + watermark), "Cornerstone" (identity-band pill + big numeral watermark),
  "Editorial Drop-Cap" (oversized first-letter, no icon). **Bleed Statement won.** At 1024px+: the
  card shifts to 66% width via `#about .shell { justify-content: flex-end }`, the quote mark and
  icon-chip bleed over the top corners (partially clipped by the card's own `overflow: hidden` —
  deliberate, reads as "tucked behind the rounded corner" rather than floating free), and a large,
  very-low-opacity "MSH" initials watermark fills the resulting negative space — reusing the exact
  same giant-faint-text recipe `.hero__wm` already established elsewhere on the page, so it reads as
  a deliberate site-wide device rather than a one-off. The watermark text is derived from real data
  (`profile.nameLines.map(n => n.charAt(0)).join('')`), never hand-typed. Below 1024px there's no
  room for asymmetry, so the card stays full-width and the quote/icon sit in normal flow.
  - **Caught a third instance of the same cascade-collision bug class while implementing the
    pick**: `.about-card__icon` also carries the shared `.icon-chip` component class, whose own base
    rule sets `position: relative` at equal specificity (0,1,0) and sits later in the file (line
    ~1738) than the new `.about-card__icon` bleed override — so it silently won `position` back
    while the override's `top`/`right` values applied unopposed, a half-broken state a screenshot
    alone didn't make obvious (the icon just looked "slightly off," not obviously wrong) until
    computed styles were checked directly. Fixed by rescoping to `.about-card .about-card__icon`
    (0,2,0), which decisively outranks bare `.icon-chip` regardless of source order.

## Verification

Zero console/page errors at 360/768/1024/1440 with `reducedMotion: 'reduce'`. Globe element confirmed
fully absent from the DOM post-change. Menu button icon confirmed 0.00px off true center at all four
breakpoints (was 2.4-3.0px before the fix). CTA buttons' computed `background-image` confirmed to
contain both gradient layers (sheen sweep + base color) after the fix, not just one. About card's
`.about-card__icon` computed `position`/`top`/`right` re-verified after the specificity fix landed
(previously `position: relative` despite the override; now correctly `absolute`). Skills section
screenshot confirms the `[data-ci]` rotating palette is untouched by the Graphite accent change.
