# Content Map (portfolio-v2 → site)

| Site section | Source |
|--------------|--------|
| Profile / hero | `portfolio.json` → `profile` + CV copy |
| Experience | `portfolio.json` → `experiences` grouped by companies |
| BS23 roles (4) | Staff SE, Tech Lead, Senior SE, Contract SE |
| Education | `educations` + school logos |
| Skills | `stacks` / profile skills — brand pills |
| Role stacks / AI tools | Per-role `stacks[]` + `aiTools[]`, brand pills |
| Section subtitles | `portfolio.json` → `sections` → `[data-sec-sub]` |
| Hero partners | `_partnersFromExperience()` → `.partner-pill` (logo + name) |
| Socials | `social_links` |
| Stats | Derived (14+ years, 5 companies, etc.) |

## Brand pills
- `PORTFOLIO_DATA.brands` maps a tech name → `{ icon, color }`; Simple Icons SVGs in `public/assets/img/brands/`.
- `PORTFOLIO_DATA.brandOf(name)` resolves `{ label, color, src, mono, fg }`.
- Pill surface: gradient + radial brand wash + outset shadow; mono badge = brand gradient fill + white letters;
  logo badges show full-colour SVG on hover scale.
- Hover/focus: sheen sweep (`::before`) + elevate + brand glow (`.spec::after`); stagger via `[data-stagger]`.
- Projects/"Selected Work" section removed — it contained fabricated project names not present in the CV; nav/hero CTA now point to Experience instead.

## Motion
- `motion.js` uses vendored Motion One (`window.Motion`) for magnetic CTAs (`[data-magnetic]`) and hero-card 3D tilt (spring physics); disabled under `prefers-reduced-motion`.

## Assets
- Logos: `portfolio-v2/codes/public/assets/logos/`
- Hero photo: `saniyat-hossain.jpg`, framed in a `.hero-portrait` panel matching its native 3:4 aspect ratio (no distorted/cropped "cover" over a wide hero — this previously cropped to hair only). Grayscale base → colour liquid brush reveal on hover, scoped to the frame.
- Brand icons: `public/assets/img/brands/*.svg`
- Bismillah SVG: available for future navbar brand
