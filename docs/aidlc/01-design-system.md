# Design System (Lumora Base Template)

## Palette
- Page: `#ffffff` / text `#111111`
- Ink cards: `#0a0a0a`
- Accent: `#b15f2c`, bright `#cf8047`, dark `#97501f`
- Surfaces: `#f1f0ee`, `#e3e2df`, line `#e6e5e2`
- Hero: `#ecebe9` → `#c9c9c9`

## Typography
- Body/UI: macOS system stack — `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif` (no web-font download; zero extra network requests)
- Code/mono: `ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace`
- Global rendering polish: `-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`, `font-feature-settings: "kern","liga","calt"`
- Text-shadow tokens `--text-sh` / `--text-sh-sm` on headings/eyebrows for subtle depth
- `.grad` gradient-text utility (accent gradient + `gradflow` shimmer) used on the hero surname
- Watermark: `13rem`, shell: `88rem`

## Motion
- Loader: 1300ms easeInOutCubic count, slide-up exit
- Reveals: IntersectionObserver + CSS transitions
- Hero liquid canvas: brush radius 143px, decay 0.016
- `prefers-reduced-motion`: disable canvas + animations

## Sections (DOM order)
Loader → Header → Hero → About → CreateBand → Portfolio → Experience → Skills → Stats → Education → Footer → NavMenu → RequestModal
