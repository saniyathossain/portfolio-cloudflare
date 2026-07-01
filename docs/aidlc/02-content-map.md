# Content Map (portfolio-v2 → site)

| Site section | Source |
|--------------|--------|
| Profile / hero | `profile.json` + CV copy |
| Experience | `experiences.json` grouped by `companies.json` |
| BS23 roles (4) | Staff SE, Tech Lead, Senior SE, Contract SE |
| Education | `educations.json` + school logos |
| Skills | `stacks.json` / profile skills — rendered as brand pills |
| Role stacks / AI tools | Per-role `stacks[]` + `aiTools[]` in `data.js`, rendered as brand pills |
| Socials | `social_links.json` |
| Stats | Derived (14+ years, 5 companies, etc.) |

## Brand pills
- `PORTFOLIO_DATA.brands` maps a tech name → `{ icon, color }`; 36 real Simple Icons SVGs live in `public/assets/img/brands/`.
- `PORTFOLIO_DATA.brandOf(name)` resolves `{ label, color, src, mono, fg }` — `fg` is a WCAG-luminance-based readable foreground (`#111` or `#fff`) for the monogram fallback.
- Pill = "status tag": glass blur pill + a solid brand-colour circular badge (icon forced white via `filter: brightness(0) invert(1)` for guaranteed contrast at small sizes — fixes icons disappearing/showing only a sliver at 12–18px), label in high-contrast `#171717`.
- Hover/focus: shimmer sweep + elevate + brand-coloured glow; staggered entrance via `[data-stagger]`.
- Projects/"Selected Work" section removed — it contained fabricated project names not present in the CV; nav/hero CTA now point to Experience instead.

## Motion
- `motion.js` uses vendored Motion One (`window.Motion`) for magnetic CTAs (`[data-magnetic]`) and hero-card 3D tilt (spring physics); disabled under `prefers-reduced-motion`.

## Assets
- Logos: `portfolio-v2/codes/public/assets/logos/`
- Hero photo: `saniyat-hossain.jpg`, framed in a `.hero-portrait` panel matching its native 3:4 aspect ratio (no distorted/cropped "cover" over a wide hero — this previously cropped to hair only). Grayscale base → colour liquid brush reveal on hover, scoped to the frame.
- Brand icons: `public/assets/img/brands/*.svg`
- Bismillah SVG: available for future navbar brand
