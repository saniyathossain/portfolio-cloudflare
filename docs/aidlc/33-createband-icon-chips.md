# 33 — Code/Ship/Scale: icon-chips matching "What I build"

Added a proper shiny icon-chip to each of the "Code"/"Ship"/"Scale" tiles — the request was to make
them "like the 'what I do' icon button, shiny," referring to the `.service-row__icon` treatment
directly below this band in the "What I build" section.

## What changed

Reused the exact existing shiny-tile recipe (`.icon-chip` — the same shared selector group as
`.service-row__icon`/`.exp-row__icon`/`.point-chip`/`.hero-card__arrow`, so it already carries the
diagonal specular gloss `::before` and layered gradient/shadow with zero new CSS for the base
look) rather than inventing a new chip style:

- **Code** → `code` icon (`</>`), chip tinted violet (`--tint: var(--c-violet)`) to match the
  tile's own hue
- **Ship** → `rocket` icon, chip uses `icon-chip--on-dark` (translucent white) instead of a tint,
  since the tile itself is a solid copper fill — a light-tinted chip would have had too little
  contrast against it
- **Scale** → `layers` icon, chip tinted teal to match

`.create-band__tile`'s layout changed from `display: grid; place-items: center` (one centered
child) to a flex column (icon above label, `gap: 0.6rem`) to fit the new icon-chip without
disturbing the existing stagger-reveal/hover-lift transitions, which apply to the tile itself, not
its children. The dark arrow tile in the middle was left untouched — it already has its own icon
and reads as a connector between the two labeled tiles, not a third labeled concept.

## Verification

Zero console/page errors at 360/768/1440 with reduced motion. Confirmed each icon-chip renders
with the correct tint (violet/on-dark/teal) and the shared gloss overlay via screenshot. CSS
brace-balance confirmed 0. Full asset-version chain re-run since `styles.css` changed.
