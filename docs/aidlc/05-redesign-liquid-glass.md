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
