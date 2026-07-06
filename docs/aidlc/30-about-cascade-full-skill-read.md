# 30 — About "Cascade": reading skills in full instead of summarizing

The user called out that repeated About-section rounds were converging on the same underlying
idea (color/decorate a few words in an otherwise-unchanged flowing paragraph) dressed up in
different CSS techniques, and that this suggested shallow skill application rather than genuine
synthesis. Read the actual skill files in full this time — `high-end-visual-design`,
`minimalist-ui`, `industrial-brutalist-ui`, `redesign-existing-projects`, `emil-design-eng` — not
summaries of them, to find what had actually been missed.

## What the full reads surfaced that summaries hadn't

- `redesign-existing-projects` explicitly lists **"Pill-shaped 'New' and 'Beta' badges"** under
  Component Patterns as a generic-AI tell to replace — the exact shape of the inline chip treatment
  shipped in doc 29, applied to body-text emphasis rather than actual metadata badges. Confirms the
  rejection wasn't arbitrary taste; it's a named anti-pattern in a skill already installed in this
  project.
- The same skill separately warns: **"Empty, flat sections with no visual depth... feel
  unfinished"** and **"No overlap or depth. Elements sit flat next to each other."** The About
  section had been progressively stripped of structure across three rounds (stacked card → bled
  card → cardless flowing paragraph), chasing "minimal" until it landed in exactly this
  anti-pattern — plain text on a plain background, no matter how the words were colored.
- `high-end-visual-design`'s "Variance Mandate" ("never generate the exact same layout twice") and
  its Layout Archetypes (Asymmetrical Bento, Z-Axis Cascade, Editorial Split) point at composition
  and scale as the actual levers for "premium," not word-level color decoration.

## Three structurally different options, not more color variants

Built and rendered three options, each pulling from a distinct skill archetype so they'd actually
differ in kind:

1. **The Ledger** — a single nested "double-bezel" card (`high-end-visual-design`'s term: tinted
   outer shell + white inner core with its own shadow/highlight) with a massive real stat ("14+"
   years, from `profile.years`) carrying the accent color, quiet body text below.
2. **The Cascade** — two real, separately-bordered cards physically overlapping at opposing
   rotations (a small stat card tucked behind a larger tilted statement card), not a single flat
   panel or a color sliver — a bolder, more tactile execution of "layered depth" than the original
   round-1 attempt. **Picked.**
3. **The Blueprint** — sharp 90-degree corners, visible hairline dividing rules, monospace
   all-caps metadata labels, a viewport-scale bleeding numeral (`industrial-brutalist-ui`'s Swiss
   Industrial Print mode, adapted to the site's required light theme).

All three keep exactly one accent color (copper, on the numeral) instead of the three competing
highlight colors shipped in doc 29 — the emphasis now comes from real scale contrast and physical
card depth, not from tinting individual words.

## Implementation

`.about-cascade__stat-card` (rotate(-3deg), real border/shadow) renders first with a bottom margin
that overlaps `.about-cascade__main-card` (rotate(1.5deg), higher z-index) without covering its own
content — the first attempt at this overlap literally clipped the stat card's second line of text
under the main card; fixed by giving the stat card enough bottom padding that the overlap eats into
empty space, not the kicker label. `data-blur-highlight` was removed from the statement entirely
(no more inline word coloring); the underlying `:colorkey` parsing in `blur-reveal.js` is left in
place since it's a generic, harmless capability of the shared reveal system used by 7 other
callers, not About-specific code — only the now-dead CSS classes for the 3 named highlight colors
were removed.

## Verification

Zero console/page errors at 360/768/1024/1440, both reduced and normal motion. Confirmed the full
asset-version chain (`set-asset-version.js` → `minify-js.js` → `sync-head.js` → `hash-sw.js`) ran
and produced a single consistent `?v=` hash before calling this done — see
`feedback_bump_asset_version_after_edits` in cross-session memory. CSS brace-balance confirmed 0.
