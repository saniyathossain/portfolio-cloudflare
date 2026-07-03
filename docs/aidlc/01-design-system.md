# Design System (Lumora Base Template)

## Palette
- Page: `#ffffff` / text `#111111`
- Ink cards: `#0a0a0a`
- Accent: `#b15f2c`, bright `#cf8047`, dark `#97501f`
- Surfaces: `#f1f0ee`, `#e3e2df`, line `#e6e5e2`
- Hero: `#f1f0ee` → `#e3e2df` (`--hero-from` / `--hero-to`)

## Typography
- Body/UI: **SF Pro system-first** — `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro
  Text", "Inter", ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
  Apple devices render true SF Pro (Tahoe); Android/Windows/Linux fall back to self-hosted Inter
  (`/assets/fonts/inter-latin.woff2`, `font-display: swap`) — **not** preloaded (fallback-only).
- Code/mono: `ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace`
- Global rendering polish: `-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`, `font-feature-settings: "kern","liga","calt"`, `font-optical-sizing: auto`
- Text-shadow tokens: `--text-sh` / `--text-sh-sm` / `--text-sh-dark` / `--text-sh-emboss` (eyebrows) /
  `--text-sh-tint` (section H2 coloured depth)
- `.grad` gradient-text utility — cohesive copper tri-stop (`--grad-warm-from/via/to`: accent-dark →
  accent → accent-bright) — used on the hero surname (`gradflow` shimmer). Cool azure→cyan→teal
  (`--grad-from/via/to`) backs the ambient `--grad-soft` tri-stop wash instead (hero-card, CreateBand ghost tile)
- Hero name: Mohammad + Saniyat = `var(--ink)`; Hossain = copper `.grad` (see `05-redesign-liquid-glass.md` §13)
- Watermark: `13rem` footer + hero (`.hero__wm`), shell: `88rem`
- Section subtitles: `.sec-sub` — `text-shadow: var(--text-sh-sm)`; copy from `portfolio.json` `sections`

## Colour tokens (Tahoe hues)
- Core: `--primary`/`--primary-deep` (azure), `--teal`/`--teal-deep`, `--accent`/`-bright`/`-dark` (copper)
- Aurora palette: `--c-violet`, `--c-blue`, `--c-cyan`, `--c-teal`, `--c-amber`, `--c-rose`, `--c-green`, `--c-mint`
- `--tint`/`--tint-deep`: per-section driver, overridden per id (`#about`, `#services`, `#experience`,
  `#skills`, `#education`) and per-item via `[data-ci="blue|teal|purple|orange|cyan|green|pink|indigo|mint"]`
- `--grad-soft`: soft tri-stop cool wash (`color-mix`-based) for ambient card/tile accents — sparing use only

## Liquid-glass primitives
- `.glass-panel` / `.glass-card` / `.hero-card`: blur + saturate (`--glass-blur`/`--glass-blur-lg`),
  a tint-aware `::before` inner glow (mixes `var(--tint)` so each panel reads its section/`[data-ci]`
  hue through the frost), a soft-light `::after` sheen film, and a hue-tinted 1px inset rim folded
  into `--glass-highlight`
- **Shiny tinted chip** (`.icon-chip`, `.service-row__icon`, `.exp-row__icon`): gradient fill +
  `--tint` rim + inset highlight + soft coloured shadow; diagonal `::before` gloss streak + hover
  brighten. Propagated to hero-status chips, service arrows, education logo rims; experience point
  markers use `.point-chip` — glossy tinted chip + inlined `check` SVG (inherits `.exp-item[data-ci]` hue)
- **Hero partners:** `.partner-pill` — frosted blur pill with logo + company name visible (simple Lumora strip;
  not icon-only `.partner-tile` — see `15-agent-context-partner-pill-revert.md`)
- **Brand pills:** `.brand-pill` — gradient pill + brand-coloured mono badge + sheen; stack/AI groups under
  `.role-tags`
- `.beam`: animated `conic-gradient` border-beam (masked ring, `@property --beam-angle`) — hero card
  + primary CTA only
- `.spec` / `.spec--panel`: pointer-tracked radial spotlight (`motion.js` sets `--px`/`--py`);
  `--panel` is a larger, softer variant for big panels (Services/Skills/Stats)
- `.sheen`: hover-triggered diagonal light sweep via a `background-image`/`background-position`
  layer (not a pseudo-element, to avoid clashing with a component's own `::before`/`::after`)

## Motion
- Loader: 1300ms easeInOutCubic count, slide-up exit — plays on **every** load (not gated on `sessionStorage`)
- Reveals: IntersectionObserver + CSS transitions
- Hero liquid canvas: brush radius = `BRUSH_FRACTION 0.34` × min(w,h) (frame-relative, not a fixed 143px), decay 0.016
- Aurora field: ambient `body::before` drift + real canvas field (`aurora.js`, desktop/fine-pointer),
  with a throttled scroll-parallax offset (`--aurora-y`/`--glow-y`, transform-only) layered on top;
  whisper-subtle rebalance (red/pink pulled back) + a warm sun-glare bloom (see `18`)
- `prefers-reduced-motion`: disable canvas + animations + border-beam/sheen/spotlight/parallax

## Sections (DOM order)
Loader → Header → Hero → About → CreateBand → Services → Experience → Skills → Stats → Education → Footer → NavMenu → RequestModal
