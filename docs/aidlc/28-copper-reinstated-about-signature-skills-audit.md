# 28 — Copper reinstated, About "Signature Underline", skills audit

Follow-up round: copper restored as the single sitewide accent (graphite lasted one round), two more
concrete bugs fixed, a third distinct About direction shipped, and a proper audit of this project's
much-larger-than-documented skill library.

## Bugs found and fixed

1. **Clock face "not round"** — geometry verified via computed style (width === height exactly at
   every breakpoint, `border-radius: 50%`) — mathematically a perfect circle, no layout bug. The
   diagonal linear-gradient gloss it shared with `.icon-chip` was the likely culprit: a directional
   light/shadow band on a disc reads as a lopsided edge to the eye even when the geometry underneath
   is correct. Replaced with a radial "glass orb" highlight (light source hitting a sphere) — reads
   as more convincingly round, not just differently styled.
2. **Modal close button overlapping the title** — the close button is `absolute right-4 top-4` at
   `h-9 w-9` (2.25rem), placing its left edge 3.25rem from the panel's right edge, inside the panel's
   own 1.5rem padding — the title `<h2>` had no reserved clearance and ran the full padded width
   underneath it. Fixed with a `.modal-header { padding-right: 2.25rem }` wrapper.

## Copper reinstated as the single accent

Graphite (previous round) is out; copper is back, via direct instruction rather than another
options-render — `--primary`/`--primary-deep` now alias `--accent`/`--accent-dark` directly (`--primary:
var(--accent)`) instead of duplicating hex values, so every root-tint-driven control and every
`--accent`-driven control stay one source of truth.

**Caught a real regression this caused before it shipped**: `.create-band__tile--code` ("Code" in
the Code/Ship/Scale band) used `var(--primary)` for its color — which used to be a distinct azure,
then graphite, and would now silently become identical to the "Ship" tile's `var(--accent)` (both
copper) the moment `--primary` became a `--accent` alias. Caught by inspecting the render, not
assumed away — reassigned "Code" to `--c-violet` (a color it never used before) to restore the
3-way distinction, and added the shiny diagonal-gloss overlay to all four tiles (Code/Ship/arrow/
Scale) as requested, matching the `.icon-chip` gloss recipe used everywhere else on the site.

Copper now shows up consistently across: nav-desktop active/hover text and pill glow (was already
wired to `--accent`/`--accent-dark` from an earlier round — instantly correct again once the token
changed), the Experience accordion chevron (new `color: var(--accent)` rule, was previously
unstyled/inherited), the menu button/toggle (black base gradient + copper border/glow + copper bars
on hover/open — "copper, black, and other theme colors" combined in one control), the drawer's nav
item icon-chips (copper gradient tile, sized up from 1.05rem to 1.3rem so the glyph actually fills
the tile — scoped to `.nav-overlay__item .icon-chip`, a 2-class selector that decisively outranks
the shared `.icon-chip--on-dark`/`.icon-chip--md` rules regardless of source order, so the stats-panel
icon elsewhere on the page is untouched), and the "View experience" `.beam` border animation (free —
it already read `var(--tint, var(--primary))`, so the alias made it copper with zero direct edits).

## About section — third direction: "Signature Underline"

Removed the glass-card/backdrop/bled-quote composition from two rounds ago entirely. The statement
now flows directly on the section background with no panel at all, anchored by a rose-tinted
drop-cap first letter instead of a literal icon (the "engineer" icon-chip and the quote-mark glyph
are both gone) — picked from two real rendered options (the other being a hairline-ruled "Editorial
Dossier" spec-sheet layout) informed by a fresh skills read (below). About's section tint changed
from teal to rose (`--c-rose`/`#c4214f`), also picked from real rendered alternatives (indigo, rose,
keep-teal).

**Caught a real cross-feature bug while wiring up the drop-cap, verified by direct testing rather
than a single screenshot**: `::first-letter` on the statement `<h2>` works perfectly under
`prefers-reduced-motion: reduce` (confirmed via screenshot) but silently does nothing under normal
motion — `blur-reveal.js` wraps every word in its own `<span>` for the per-word fade-in, and
`::first-letter` on the parent element can't reach through into a child element to style its first
letter. A screenshot taken only under reduced motion (this session's own established testing
default) would have shipped a drop-cap that works for accessibility-preference users and silently
fails for everyone else — caught by explicitly testing both motion paths, not just the one that
happened to work first. Fixed with two selectors: `.about-signature__statement::first-letter`
(fires when reduced motion leaves plain text in the h2) and
`.about-signature__statement .blur-reveal__word:first-of-type::first-letter` (fires when normal
motion has wrapped the first word in a span) — both verified rendering the drop cap correctly, not
just the one that happened to work in an initial screenshot.

## Skills audit

`.agents/skills/` actually contains ~46 locked skills (`skills-lock.json`), not the 16 CLAUDE.md
still describes — that count is stale. Of the skills never read by earlier design rounds this
session, most are irrelevant video/animation-production tooling (all `gsap-*`, all `hyperframes-*`,
`embedded-captions`, `motion-graphics`, `remotion-*`, `figma`, etc. — this is a static Alpine.js site
with a hand-written CSS design system, no GSAP/Remotion/Figma/video pipeline anywhere in it). Six
were genuinely relevant and unread: `animation-vocabulary` and `review-animations` (Emil Kowalski's
motion-naming and animation-review rubrics — applicable to auditing this site's existing hover/reveal
transitions), `brandkit` (multi-color brand systems — the most useful source for "how to combine
colors well," directly informing the copper+secondary-accent pairing methodology used above),
`industrial-brutalist-ui` (a contrasting aesthetic, useful specifically for its "second accent scoped
to exactly one functional role" color-discipline rule, not for adopting brutalism itself), and
`stitch-design-taste` (relevant but redundant — same single-accent doctrine already known from
skills read in earlier rounds). `gpt-taste`, `image-to-code`, and `imagegen-frontend-web` were
checked and dismissed — all three assume a React/Tailwind or image-generation-first build pipeline
this project doesn't use.

## Verification

Zero console/page errors at 360/768/1024/1440, both `reducedMotion: 'reduce'` and normal motion,
scrolled through the full page at every width. CSS brace-balance confirmed 0 after all edits. Clock
geometry reconfirmed via computed `getBoundingClientRect()` (unchanged — the fix was cosmetic, not
structural). Modal header clearance verified by screenshot — title no longer runs under the close
button. Drop-cap verified rendering correctly under both motion settings via direct DOM inspection,
not just a single screenshot. Full CSS/JS pipeline rebuilt after every change.
