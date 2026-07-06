# 31 — About: cardless again, but with color/shadow doing the work this time

Fifth About direction. The request was explicit: show variations spanning both "with card" and
"without card," each carrying real color+shadow typography, informed by re-checking the original
reference sites (animmasterlib.dev, skiper-ui.com, vengenceui.com, the 2 Instagram reels) with a
narrower lens this time — specifically how they treat body/bio text, not nav or grid chrome.

## Reference re-check findings (honest, not fabricated)

Most of the reference material remains inaccessible for implementation detail: animmasterlib.dev's
"Text Animations" category is paywalled same as every other category checked so far; skiper-ui.com's
component internals didn't resolve past thumbnails; both Instagram reels are confirmed (a third
time now) to be video-production marketing content, not UI captures. The one concrete, directly
observed data point: vengenceui.com's own live testimonial section uses **plain bordered cards with
minimal decoration**, explicitly favoring "clean, minimal design" over "elaborate gradients or
shadows" — a real signal toward restraint, not more effects. Everything else in the synthesis
(gradient text on a lead line only, layered shadow reserved for short accent phrases rather than
full paragraphs) is a reasoned extrapolation from established CSS practice, flagged as such rather
than presented as observed fact.

## Three options shown together, not sequentially

Built and rendered three card/cardless combinations side by side, each carrying the same
copper/rose colored-and-shadowed phrase emphasis so the comparison isolated structure, not color:

1. **Cascade + Color** — the two-card overlap from doc 30, with the phrase-color treatment added
   back on top of it.
2. **Cardless + Color** — a small kicker label + the statement flowing directly on the background,
   colored phrases carrying the visual interest instead of any card. **Picked.**
3. **Ledger + Color** — the nested double-bezel single card (shown once before, never picked) with
   both the massive numeral and colored phrases together.

Going cardless was a deliberate pick this time, not a default — the key difference from doc 30's
cardless attempt (which read as "empty and unfinished") is that this one is never actually visually
quiet: color and shadow carry the weight a card's depth carried in the other options.

## Implementation

Restored `data-blur-highlight="telco-scale:copper|quiet precision:rose"` on the statement (the
`:colorkey` parsing mechanism in `blur-reveal.js` was left in place in doc 30 specifically so this
was possible without touching JS again). Each color gets a **layered shadow** — a crisp 1px offset
in a darker shade of the same hue, plus a soft color-matched glow — reading as embossed/lit rather
than a flat color swap, and deliberately scoped to two short phrases only (per the "reserve heavy
shadow for accent phrases, not full paragraphs" legibility point from the reference re-check).
Learned from doc 27's bug the first time around: `.about-plain .about-plain__statement` is scoped
with two class selectors from the start, not one, so it can't lose to `.sec h2`'s class+element
specificity the way `.about-card__statement` did before the fix landed there.

## Verification

Zero console/page errors at 360/768/1440, both reduced and normal motion. Confirmed via
`querySelectorAll` that both `--hl-copper`/`--hl-rose` classes land on the correct words under
reduced motion specifically (the path most likely to silently regress, per doc 29's bug). Full
asset-version chain run and confirmed as a single consistent `?v=` hash before calling this done.
