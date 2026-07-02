# 05 — Liquid Glass Redesign (macOS Tahoe)

> Professional UI/UX pass to make the portfolio polished, colorful, fluid and
> premium — a coherent **Liquid Glass** design language inspired by macOS Tahoe
> and the "motion makes status tags feel premium" reference
> ([Ali Grids / Adrian Daniluk](https://x.com/AliGrids/status/2044724263781863458)).

## 1. Problem analysis (what was off)

| Area | Issue | Fix |
| --- | --- | --- |
| Hero image | Small (15rem), felt like a thumbnail; not proportionate to the frame; weak on mobile | Larger fluid portrait (clamp), native 4/5 ratio, floating glass frame, face-safe object-position, layered depth |
| Sections | Flat white, no depth, generic template rhythm; "not lucrative" | Floating **liquid-glass panels** over a soft colorful **aurora** field; consistent radii, borders, specular edges |
| Experience | Plain bordered list, poor alignment, low hierarchy | Glass **timeline** with company glass cards + role sub-cards, connective rail, node dots |
| Pills | Flat frosted, muted, low delight | **Liquid-glass status tags**: colorful brand glow, pointer-tracked specular highlight, spring lift (the tweet effect) |
| Type | Adequate but flat | Larger fluid display type, gradient accents, tighter tracking, refined rhythm, text-shadow depth |
| Color | Mono/warm only | Add a controlled aurora palette (violet / blue / teal / amber / rose) used only as ambient light + tints, keeping copper as the brand anchor |
| Motion | Magnetic + tilt only | Add pointer specular on glass, floating hero, staggered reveals, scroll polish; all gated by `prefers-reduced-motion` |

## 2. Design language: "Liquid Glass"

Three material layers, Tahoe-style:

1. **Field** — a soft, slowly drifting aurora (blurred colored orbs) behind everything on a near-white base. Provides color that glass refracts.
2. **Glass** — translucent panels/cards: `backdrop-filter: blur+saturate`, hairline light border, **inset top specular highlight**, soft ambient shadow. Content sits on glass, so the aurora tints it.
3. **Ink** — solid dark surfaces (loader, stats, footer, nav overlay) for contrast anchors.

### Tokens (in `:root`)
- Material: `--glass-bg`, `--glass-bg-strong`, `--glass-border`, `--glass-blur`, `--glass-shadow`, `--glass-highlight`.
- Aurora palette: `--c-violet #7c5cff`, `--c-blue #2f6bff`, `--c-cyan #19b9d6`, `--c-teal #12b3a6`, `--c-amber #f0a030`, `--c-rose #f0577f`.
- Brand anchor: existing copper `--accent` retained; gradients enriched.
- Radii unchanged (pill / card 2rem / card-sm 1.25rem).

### Reusable classes
- `.aurora` — fixed background field (via `body::before`), `auroraDrift` keyframes.
- `.glass-panel` — large frosted container.
- `.glass-card` — smaller frosted card with hover lift + specular.
- `.spec` — pointer-tracked specular (`--px/--py` set by JS) used by pills & cards.

## 3. Component specs

### Pills (liquid-glass status tags)
- Frosted glass base + hairline border + inset top highlight.
- Brand color: solid icon badge (white icon) **and** a soft radial brand glow behind the pill; on hover a colored ring + colored shadow.
- **Specular**: radial white highlight follows the pointer (`--px/--py`), intensifies on hover — the premium "liquid" refraction from the reference.
- Motion: spring lift + scale, badge nudge/rotate, sheen sweep, staggered entrance.
- Fully keyboard-focusable (`:focus-visible` mirrors hover).

### Hero
- Left: eyebrow, fluid display name (gradient surname), rating, CTAs (magnetic).
- Right: large floating glass **portrait** (native 4/5, liquid grayscale→color reveal), a small glass **now/role card**, and a "worked with" partner rail.
- Portrait sizes with `clamp()`; on mobile becomes a centered, comfortably-sized card (never "just hair").

### Experience (timeline)
- Vertical rail on the left; each company is a glass card with logo + node dot; roles are nested glass sub-cards with period, summary, stack/AI pill rows, and expandable details.

### Services / Skills / Education
- Services: one glass panel, rows highlight to a tinted glass on hover.
- Skills: two glass panels (groups) full of liquid-glass pills.
- Education: glass cards per row.

## 4. Motion inventory
- Loader wipe (existing), header spring-in (existing).
- Hero line-reveal + gradient flow + gentle float on portrait.
- Reveal-on-scroll + staggered pill/children entrances.
- Magnetic CTAs, 3D tilt on hero card, **pointer specular** on all glass.
- All disabled under `prefers-reduced-motion`.

## 5. Responsiveness / fluidity
- Root font already scales with viewport (vw-based) → rem values stay fluid.
- Grids collapse: hero 2-col → 1-col; skills 2-col → 1-col; experience rail stays but padding tightens; pills wrap.
- Glass blur reduced on small screens for perf; aurora simplified.

## 6. Constraints honored
- No npm/node at runtime; Tailwind rebuilt via `build-css.sh`.
- No `eval` / `new Function`.
- `data.js` remains the single content source; no fabricated content.
- Security headers untouched (`src/index.js`).

## 7. Files touched
- `public/assets/css/styles.css` — design system + all components.
- `public/index.html` — section wrappers, hero layout, experience timeline markup.
- `public/assets/js/motion.js` — pointer specular tracking + float.
- `docs/aidlc/01-design-system.md` — token/material reference (follow-up).

## 8. macOS Tahoe polish pass (see `06-tahoe-refinement-plan.md`)

A later refinement pass aligned the motion + material tokens to the authentic Tahoe language
proven in the `cursor-presentation` deck (light-only, no structural changes):

- **Easing:** `--ease-glass: cubic-bezier(0.32, 0.72, 0, 1)` (Tahoe soft settle, replaces the old
  `.33,1,.38,1`) + new `--ease-smooth: cubic-bezier(0.22, 0.61, 0.36, 1)` for scroll reveals.
- **Frosted material:** blur retuned to `blur(24px) saturate(200%)` (`--glass-blur`) /
  `blur(34px) saturate(205%)` (`--glass-blur-lg`); a soft-light top **specular film** (new
  `--glass-sheen` token) on `.glass-panel` / `.glass-card` / `.glass-pill` / `.hero-card`; GPU
  hints (`translateZ(0)`, `contain: paint`).
- **Ambient palette:** aurora hues shifted to the Tahoe system palette (indigo `#6e6cf0`, blue
  `#0a84ff`, cyan `#64d2ff`, teal `#3fd0e0`, orange `#ff9f0a`, pink `#ff5c8a`). Brand copper
  `--accent` is unchanged.
- **Pills:** softer/longer hover+focus settle, stronger brand-colored glow, `:focus-visible`
  mirrors `:hover` (lift + label expand + glow + ring).
- **JS springs:** `motion.js` springs softened (lower stiffness, gentle overshoot); `toggleRole`
  height animation uses the Tahoe curve. All still gated by `prefers-reduced-motion`.

## 9. Typography + photo-driven colour harmony

- **Type:** kept the SF Pro **system** stack (no web font — Tahoe-native, zero network cost).
  Antialiasing is global (`*`/`html`/`body`); added `text-wrap: balance` on headings and
  `text-wrap: pretty` on body copy, and softened the light-mode `--text-sh` for crisper text.
- **Palette (teal-and-orange from the portrait):** new cool-primary tokens sampled from the photo —
  `--primary #2f9fd6` (azure shirt) / `--primary-deep #1a6f96` (ink) and `--teal #2b8c9a` / `--teal-deep`.
  Copper `--accent` stays as the **warm** accent. The hero surname gradient is now azure→cyan→teal;
  the hero glow shifted to azure/cyan with a copper whisper.
- **Per-section tints:** a single `--tint` / `--tint-deep` driver powers each section's eyebrow,
  icon-chip, hairlines and hover fills. Section overrides (by id): Hero=azure (default), About/Education=teal,
  Services=copper, Experience=blue, Skills=cyan. Text uses the readable `-deep` variants (AA on white).
- Constraints unchanged: no external requests, no inline styles, CSP/Worker/PageSpeed untouched.

## 10. Shadow depth + slide-13 multi-hue cards

A final polish pass borrowed from `cursor-presentation` slide 13 (multi-hue Tahoe cards) and
its shadow tokens:

- **Text shadows:** `--text-sh-sm` on secondary copy over light glass (service/exp descriptions,
  edu degree, hero card title, hero status, role-tag labels). New `--text-sh-dark` on ink surfaces
  (stats labels, footer copy, nav overlay items).
- **Accent glows (sparing):** hero surname gradient gets a cool azure/cyan drop-shadow (not warm
  copper); brand spark icons (header, loader, footer) keep a copper glow; stats counts and nav
  overlay hover pick up hue-matched glows.
- **`[data-ci]` hue map:** eight Tahoe hues (`blue`, `teal`, `purple`, `orange`, `cyan`, `green`,
  `pink`, `indigo`) each set `--tint` + `--tint-deep` on the element. Alpine `:data-ci` cycles on
  loop items:
  - Skills (5): blue · teal · purple · orange · cyan
  - Services (4): blue · teal · purple · orange
  - Education (3): blue · teal · purple
  - Stats (4): cyan · teal · green · orange
- **Coloured accents:** skills glass panels and education rows get `border-top: 2px solid
  var(--tint)`; stats icon-chips and count gradients inherit each item's vivid `--tint` on the dark
  panel. Section-level tints (hero/about/services/experience/skills) remain as the ambient driver;
  per-item `[data-ci]` only overrides inside the loop item.
- No Tailwind rebuild; CSS + small Alpine bindings only; light-only; AA contrast preserved via
  `--tint-deep` on readable text.

## 11. Colour variety, hero cascade, deeper glass, signature motion

Full plan in `docs/aidlc/09-tahoe-colour-motion-refinement-plan.md`. Summary of what shipped and
where the implementation deviated (deliberately) from the literal plan text:

- **Hero name warm+cool cascade:** line 1 "Mohammad" = soft ink (`rgba(17,17,17,.74)`), line 2
  "Saniyat" = deep azure (`--primary-deep` + faint azure text-shadow), line 3 "Hossain" (`.grad`)
  retuned to **warm** copper→gold via new `--grad-warm-from/via/to` tokens; its drop-shadow swapped
  from azure/cyan to copper/gold. `.hero__copy--on-dark` (portrait overlay) unchanged — already fit.
  - *Deviation:* the plan assumed `.line-inner:nth-child(1/2/3)` already staggers per line; in the
    real markup each `.line-inner` is the **sole** child of its own `.line-wrap`, so `nth-child(2)`/
    `(3)` never match (only `nth-child(1)` ever fires — a pre-existing latent bug, left alone).
    The new per-line colour rules instead select `.line-wrap:nth-of-type(n)` (siblings under `<h1>`,
    so this correctly discriminates line 1/2/3) wrapped in `:where()` so they contribute **zero**
    specificity — this guarantees the existing higher-specificity `.hero__copy--on-dark` override
    still wins when the hero flips to the on-dark portrait state.
- **Colour variety:** formalised `--c-green`/`--c-mint` tokens (green was previously inlined) and a
  new tri-stop `--grad-soft` (azure→cyan→teal, `color-mix`-based) ambient wash. Education now owns
  its own hue — mint/green (`--c-green` / `--tint-deep:#146b29`, tuned darker than the plan's
  `#1d8a37` to clear 4.5:1 AA at the small chip sizes education text uses) — instead of sharing teal
  with About. `[data-ci]` cycles diversified: Education → `teal · green · indigo` (was
  `blue · teal · purple`); Skills/Services/Stats unchanged (already varied). `--grad-soft` applied
  sparingly as an ambient wash on the hero-card background and the CreateBand "Better" ghost tile
  (replacing its old hard-coded two-stop blue/cyan gradient).
- **Deeper frosted glass:** `.glass-panel::before` / `.glass-card::before` now mix in `var(--tint)`
  (each panel picks up its section/`[data-ci]` hue through the frost instead of a fixed
  violet/cyan wash). The "refracted rim" is a full 1px hue-tinted inset ring folded into the shared
  `--glass-highlight` token (`inset 0 0 0 1px color-mix(in srgb, var(--tint) 20%, transparent)`,
  alongside the existing top light line) rather than a separate pseudo-element/`border-image` —
  `border-image` breaks `border-radius` on these rounded cards, so a tinted inset box-shadow ring
  was the robust, rounded-corner-safe choice. `--glass-blur`/`--glass-blur-lg` nudged up
  (24→26px / 34→38px, saturate 200→215% / 205→220%) for a richer frost; mobile
  `max-width:640px` reduced-blur fallback and the `@supports not (backdrop-filter)` opaque fallback
  are untouched. Popover tooltips and the header clock-chip were assessed and intentionally **not**
  converted to glass: the popover was made solid white/opaque in an earlier pass specifically for
  tooltip readability, and the clock-chip already lives inside the frosted `.glass-pill` header.
- **Signature motion (all four, GPU-only, reduced-motion-gated):**
  1. **Gradient border-beam** (`.beam`) — `@property --beam-angle` + a rotating `conic-gradient`
     `::before` masked to a 1.5px ring (`mask-composite: exclude`) on the hero card + hero's
     primary CTA ("Get in touch"). Static tinted ring under reduced-motion.
  2. **Panel cursor spotlight** (`.spec.spec--panel`) — the existing `.spec` mechanism
     (`motion.js` `specular()` already binds any `.spec` element; no JS change needed) gets a
     larger, softer radial (`--spec--panel`) so the highlight reads correctly across whole large
     panels (Services list, each Skills panel, Stats panel) instead of the small 16rem pill variant.
  3. **Aurora parallax** — `motion.js` adds a throttled (`rAF`) scroll listener that writes
     `--aurora-y` (on `body`) and `--glow-y` (on `#heroGlow`); the existing `auroraDrift` keyframes
     and the hero glow's `transform` fold these in via `calc()`/`translate3d`, so the whole effect
     stays transform-only. Runs inside `motion.js`'s existing top-of-file
     `prefers-reduced-motion` early-return — no extra guard needed.
  4. **Sheen sweep** (`.sheen`) — a diagonal hover-triggered highlight applied to the hero CTA, the
     "View experience" pill, the hero card, and education `.glass-card` rows.
     - *Deviation:* implemented as an extra `background-image` layer + `background-position`
       transition on the element itself, **not** a `::before`/`::after` pseudo-element. Both
       `.hero-card` (`::after`) and `.glass-card` (`::before`) already own a pseudo-element for
       their static sheen/light film, and `.hero-card` also needed a `::before` slot for the
       border-beam ring — there wasn't a free pseudo-element slot left for a second, independent
       hover effect. The background-layer approach composes cleanly with each component's existing
       `background` (color-only) shorthand; a `.hero-card.sheen` override additionally re-declares
       both the sweep layer and the ambient `--grad-soft` wash together so neither clobbers the
       other.
- **Motion/perf budget:** every animated property above is `transform`, `opacity`,
  `background-position`, or a small masked `conic-gradient` ring repainting a thin (1.5px) area on
  exactly two elements — no layout thrash, no new network requests, no CSP changes. See
  `07-pagespeed-seo-pwa-plan.md` for the one-line perf-budget note added alongside this pass.

## 12. SF Pro typography, shiny chips everywhere, per-role hues, hero halo, designed shadows

Full plan in `docs/aidlc/10-sf-pro-shiny-chips-shadows-plan.md`. Summary:

- **SF Pro system-first:** `--font-sans` reordered to lead with `-apple-system … "SF Pro Display"/"SF
  Text"`; Inter remains self-hosted as the non-Apple fallback (`@font-face`, `font-display: swap`).
  Inter **preload removed** from `scripts/sync-head.js` and Worker `EARLY_HINTS` (`src/index.js`) —
  Apple path = zero font download; non-Apple loads Inter on demand.
- **Hero name backing:** replaced the dark `.hero__copy--on-dark::before` card with a soft feathered
  frosted halo — low-alpha azure-tinted radial + stronger blur + `mask-image` radial fade so no box
  reads behind "Hossain" over the portrait.
- **Shiny tinted chip system:** diagonal `::before` gloss streak + hover brighten on
  `.icon-chip`/`.service-row__icon`/`.exp-row__icon` (one grouped rule). Propagated to hero-status
  chips (removed `--muted`), service-row arrows, education logo rims (`--tint` border/shadow on white
  plate). Stack/AI role-tag labels keep `--muted` where secondary.
- **Per-designation colours:** `:data-ci` on each `.exp-item` cycles 8 hues via `(gi + ri) % 8` so
  adjacent roles differ; role icon tiles + point markers inherit `--tint`/`--tint-deep` automatically.
- **Point markers:** `.exp-details__list li` restyled as mini shiny check-chips — `::before` tinted
  tile + `::after` pure-CSS check (no fetched SVG).
- **Designed shadows:** new `--text-sh-emboss` (eyebrows) and `--text-sh-tint` (section H2s); hero
  rating text gets a soft light glow; existing `--text-sh-sm`/`--text-sh-dark` usages preserved.

## 13. Loader restore, hero watermark, clean ink+copper hero, point chips, section subtitles

Full plan in `docs/aidlc/11-hero-loader-subtitles-plan.md`. Summary:

- **Loader:** removed the `sessionStorage("portfolio-visited")` early-skip in `loader.js` so the
  000→100 panel plays on every reload; `prefers-reduced-motion` still skips instantly.
- **Hero watermark:** `.hero__wm` — large translucent `profile.shortName.toUpperCase()` behind the
  hero grid (`z-index:1`, under content at `z-20`), aligned toward the portrait on desktop.
- **Hero colour:** Mohammad + Saniyat → `var(--ink)`; Hossain keeps `.grad` retuned to cohesive
  copper only (`--grad-warm-to` = `--accent-bright`, no gold). `.hero__glow` retuned to neutral
  warm-white + faint copper (azure/cyan wash removed).
- **Point markers:** `.point-chip` with inlined `iconSvg('check')` per detail line; inherits
  per-role `--tint` from `.exp-item[data-ci]`; replaces CSS-drawn `::before`/`::after` checks.
- **Section subtitles:** `portfolio.json` `sections` map + `.sec-sub` under Services/Experience/Skills/
  Education H2s; `text-shadow: var(--text-sh-sm)` — the designed subtitle shadow now has a real element.

## 14. Agent context + partner-pill revert

See `docs/aidlc/15-agent-context-partner-pill-revert.md`. Hero partners back to `.partner-pill`; liquid-glass chip
layer experiments on icons/partners **not** shipped. Cursor rules + portfolio skill committed; `.gitignore` updated.
