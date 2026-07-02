# 16 — Full-sweep modern redesign: Lumora × macOS Tahoe liquid glass, 100/100, skill-grounded

A complete tiny→big sweep to make the portfolio absolutely modern/stunning on web + mobile — blending the Lumora
template with macOS Tahoe liquid glass, antialiased SF Pro type, a cohesive palette, and genius UI/UX — while
holding **Google PageSpeed 100/100 on mobile and web**. Grounded in the installed design skills
(`redesign-existing-projects`, `high-end-visual-design`, `review-animations`, `impeccable`), the aidlc history, and
the current build.

## Decisions (confirmed)
- **Bolder structural reinvention** (asymmetric bento / editorial-split, overlap + depth, break symmetry).
- **Smart glass:** real `backdrop-filter` only on fixed/sticky surfaces (header, nav, modal, loader, clock chip);
  scrolling cards use GPU-cheap **faux-frost** (layered gradient + grain + inset edge + tinted shadow, no
  backdrop-filter) → 60fps, 100/100.
- **Anti-slop (all four):** surname → solid copper (drop gradient-text), vary eyebrow cadence, film-grain + tinted
  shadows, double-bezel cards.

## Guiding bar
Premium antialiased SF type (display tracking floor −0.04em, weight ladder, tabular-nums, balance/pretty, 65–75ch);
one cohesive accent system (copper anchor + azure/teal Tahoe, desaturated); true-glass edge = 1px inner border +
inset shadow but smart-glass for perf; double-bezel nested cards; grain + hue-tinted shadows; GPU-only motion,
sub-300ms UI, hover gated `@media (hover:hover) and (pointer:fine)`, reduced-motion = gentler-not-zero; asymmetry +
macro-whitespace; `100dvh` not `vh`; no AI tells.

## Phases
1. **Foundations** — type scale/tracking, cohesive colour + tinted-shadow tokens, macro-whitespace + z-index scale, film-grain overlay.
2. **Smart-glass material system** — split `.glass-fixed` (real blur) vs faux-frost scrolling cards; double-bezel + true-glass edge. *(the 100/100 lever)*
3. **Motion pass** — GPU-only (rework pill reveal off `grid-template-columns`), gate hover + specular/parallax to fine-pointer, sub-300ms, IO-only reveals.
4. **Structural reinvention (per section)** — hero editorial split (solid-copper surname), bento Services/Skills, layered Experience, deliberate eyebrow cadence, restaged About/Education/Footer/Nav.
5. **Mobile/responsive** — `100dvh`, single-column collapse, drop overlaps/rotations, faux-frost on mobile, 360–1440 sweep.
6. **PageSpeed 100/100 + audit** — images AVIF/WebP, defer JS, CLS/LCP/TBT, then `impeccable audit` + `review-animations` over the diff.

## Constraints
No inline `style=""`; `portfolio.json` single content source; `<head>` via `node scripts/sync-head.js`;
`./build-css.sh` only for new Tailwind utilities; **no new network requests**; CSP/Worker intact; light-only;
reduced-motion-gated; a11y AA.

## Execution log
- **Tranche 1 (Phase 1–2 backbone) — shipped:**
  - Smart-glass: `.glass-panel` / `.glass-card` converted to **faux-frost** (`--frost-bg`, no `backdrop-filter`);
    removed the mobile blur fallback on scrolling glass. Real blur retained on fixed surfaces (header, nav, modal,
    loader, clock chip).
  - Anti-slop: hero surname **solid copper** (dropped `background-clip:text` gradient), incl. the on-dark state.
  - Added a fixed, `pointer-events:none` **film-grain** overlay (inline data-URI SVG noise — no network).
- **Next tranches:** Phase 3 motion pass, Phase 4 per-section structural reinvention (hero split → bento
  Services/Skills → layered Experience, checkpointed section-by-section), Phase 5 mobile, Phase 6 100/100 + audit.
