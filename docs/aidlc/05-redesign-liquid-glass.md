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
