# 34 — Mac-style modal, weight-only typography, nature-inspired touches

## Reference honesty

The user shared a specific Dribbble shot (an "EcoTech Exhibition" nature-inspired landing page) and
asked for its frosted-glass and "growing" button treatment. `WebFetch` returned genuinely empty
content for that URL — Dribbble shot pages are fully client-rendered and expose nothing to a plain
HTML fetch, the same class of failure as several other reference sites earlier in this project. Said
so directly rather than inventing details about a shot never actually seen; what follows is an
honest, labeled interpretation of the *described* effects (frosted glass, a growing/extending
button), not a verified recreation.

## Modal close button — moved to the left (macOS convention)

Real macOS window controls sit top-left, not top-right. Moved `.modal-close` from `right: 1rem` to
`left: 1rem` and swapped `.modal-header`'s clearance from `padding-right` to `padding-left`
accordingly. Verified zero overlap against both the title and the eyebrow line at 8 viewport widths
(360–1440px), the same regression class fixed twice before in this exact spot (doc 28, doc 32) —
this time confirmed with the button already on the correct side from the start rather than
discovering another position bug later.

## About statement — weight-only emphasis, no color, no shadow

Third rejection of colored-phrase treatments in a row (glow-shadow emboss in doc 29, inline chip
badges in doc 30, both explicitly disliked) made "keep guessing at a different color technique"
the wrong move. Built four options that all removed color-plus-shadow as the mechanism entirely —
flat color/no shadow, underlined phrases with plain ink text, weight-only monochrome contrast, and
a soft marker-style background chip — and let the actual choice pick the direction rather than
another solo guess. **Weight-only won**: `.blur-reveal__word--hl` is now just `color: var(--ink);
font-weight: 800` — no hue anywhere in the statement, emphasis purely from contrast against the
lighter body weight. `portfolio.json`'s `aboutHighlights` simplified from `{phrase, color}` objects
to plain phrase strings, since color is no longer part of what this data drives — matches
`blur-reveal.js`'s already-supported no-colon-suffix path from doc 29, no JS changes needed.

## Hero-card — faux-frost, not real backdrop-filter

Increased the hero-card's translucency (background gradient opacity dropped from .92/.7 to .8/.52)
for a more genuinely frosted read against the hero photo behind it. Deliberately did **not** add
real `backdrop-filter` here: the card scrolls with the page (it isn't fixed/sticky), and this
project already has a `--frost-bg` token whose own comment documents exactly why —
`backdrop-filter` on scrolling content repaints every frame while in view, a real mobile
performance cost this site's 100/100 PageSpeed score was already built around avoiding. Flagged
this tradeoff rather than silently picking one side of "do what's asked" vs. "keep PageSpeed
intact" — translucency-only gets the frosted look without spending the budget on a live blur.

## "View experience" — a leaf that unfurls, a stem that grows

Added a real `leaf` icon (fetched the actual Lucide SVG source rather than approximating stroke
paths from memory, so it renders correctly and matches this project's existing icon format exactly)
to a button that previously had none. On hover: the icon-circle rotates and scales from its own
base (`transform-origin: 50% 100%`) like a leaf unfurling, and a thin green stem beneath the button
grows from 0 to full width via `transform: scaleX()` — never `width`, keeping the animation on the
GPU-only property list this codebase already follows throughout.

**Caught a real pseudo-element collision before it shipped broken**: the button already has `.beam`
(claims `::before` for its rotating conic border) and `.pill-btn-glass` (claims `::after` for its
gloss overlay) — there was no free pseudo-element slot left for the stem. Building it as `::after`
would have been silently overwritten by `.pill-btn-glass::after`'s own `content`/`background`
(equal specificity, declared later in the file) — the same collision class this project keeps
finding, caught this time by checking pseudo-element ownership *before* wiring up the new effect
rather than after a screenshot showed something missing. Fixed with a real `<span>` child element
instead, promoted above the gloss via a two-class selector (`.grow-btn > .grow-btn__stem`) that
reliably outranks `.pill-btn-glass > *`'s own `position: relative` regardless of source order.
`--c-green` is an existing Aurora token (already used for Education elsewhere) reused here, not a
new hue introduced — scoped to this one nature-themed icon, not adopted as a second sitewide accent.

## Verification

Zero console/page errors at 360/768/1024/1440, both reduced and normal motion, full page scroll plus
modal open at every width. Confirmed via computed style that the close button is `position:
absolute` on the left at all 8 tested widths. Confirmed the stem's rest-state transform is
`scaleX(0)` and hover-state is `scaleX(1)` via direct computed-style inspection, not just a
screenshot. CSS brace-balance confirmed 0. Full asset-version chain run after every CSS/JS/data
change and confirmed as a single consistent `?v=` hash before calling any of this done.
