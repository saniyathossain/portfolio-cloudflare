# 32 — Modal close button: the real bug, plus JSON-driven colors

## Modal close button — found the actual root cause

The earlier fix (doc 28: `.modal-header { padding-right: 2.25rem }`) only ever addressed the
*title*'s wrap width. The user reported the overlap was still happening, and checking fresh —
computed style, not assumption — showed why: the close button's `position` computed to
**`relative`**, not `absolute`, despite the markup using Tailwind's `absolute right-4 top-4`
utilities.

Root cause: `.modal-panel > * { position: relative; z-index: 1; }` (a pre-existing rule, for
stacking every direct child above the panel's own gloss pseudo-element) has the exact same
specificity as Tailwind's `.absolute` utility (both single-class selectors), and
`minify-css.js` concatenates `tailwind.css` **before** `styles.css` — so the custom rule always
wins the cascade tie, silently overriding the button back to normal document flow. The button was
never actually floating in the corner; it just happened to render close enough to the corner at
some viewport widths that the earlier padding fix masked it for the title line specifically,
while the shorter eyebrow line above the title (which doesn't need to wrap regardless of padding)
kept colliding with it at every single width tested (360 through 1440).

Fixed by giving the button a dedicated class and an explicit, higher-specificity rule
(`.modal-panel > .modal-close`, two class selectors — decisively outranks `.modal-panel > *`
regardless of source order) that re-declares `position: absolute` along with the size/position
values that used to live in now-removed Tailwind utility classes. Verified via computed
`getBoundingClientRect()` overlap checks (not just a screenshot) against both the title and the
eyebrow line at 8 viewport widths from 360px to 1440px — zero overlap at any of them, confirming
"with responsiveness" as asked.

## Color combinations moved into portfolio.json

Two color-assignment decisions were previously hardcoded in JS files, disconnected from the
single-content-source convention this project otherwise follows:

- **Partner logo colors** — `data.js`'s `_partnersFromExperience()` had its own hardcoded
  `brandColors` map keyed by company slug. Moved to a `"color"` field on each entry in
  portfolio.json's existing `companies` object (alongside the `name`/`logo`/`location` fields
  already sourced from there) — `_groupExperiences()` now propagates `color` through the same
  path `logo`/`location` already take, and `_partnersFromExperience()` reads `group.color`
  directly instead of a separate lookup table. Changing a partner's color is now a JSON edit.
- **About statement highlight phrases** — the `data-blur-highlight="phrase:colorkey"` pairs were
  hardcoded directly in `index.html`'s markup. Moved to a new `site.aboutHighlights` array in
  portfolio.json (`[{ "phrase": "telco-scale", "color": "copper" }, ...]`), with the HTML now
  building the attribute dynamically via `:data-blur-highlight="site.aboutHighlights.map(h =>
  h.phrase + ':' + h.color).join('|')"` — the same Alpine-binding pattern `:data-text` already
  uses successfully for the same element, so the timing (Alpine resolves the attribute before
  `blur-reveal.js` reads it) was already proven to work, not a new risk.

Left alone, deliberately: the hero-card's `tintVars()` key→CSS-var resolution (`"accent"` →
`var(--accent)`, etc.) — the *content* decision of which hero-card uses which tint key already
lives in portfolio.json's `heroCards[].tint` field; only the semantic-name-to-hex resolution
stays in JS/CSS, which is a legitimate design-token layer, not a hardcoded content decision.

## Verification

Zero console/page errors at 360/768/1024/1440 with a full-page scroll and the modal opened at
each width. Confirmed via direct DOM inspection that the About highlight classes and all 5
partner `--brand` custom properties resolve identically to their pre-migration values — this was
a data-source refactor, not a visual change. Full asset-version chain run and confirmed as a
single consistent `?v=` hash.
