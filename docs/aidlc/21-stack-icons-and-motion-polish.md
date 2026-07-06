# 21 — Stack-pill icon/color correctness + motion smoothing

## Context
Multi-agent audit (icons/colors, entrance motion, hover motion + perf) of the tech-stack "brand pills". Two
problems: (1) a few pills had wrong icons/colors (Gemini the reported example); (2) the pill motion felt "harsh".
Constraints held: Google PageSpeed, low mobile/all-browser cost, reduced-motion + touch gates intact, no new network
requests, no new animated properties.

Key facts uncovered:
- Pill logos are **local Simple-Icons SVGs** in `public/assets/img/brands/<icon>.svg` with a **baked `fill`**; they
  load as `<img>`, so CSS `--brand` cannot tint them. Two colour sources per pill: the SVG fill (logo) and the
  `data.js` `BRANDS[key].color` (drives the pill glow/tint + lettermark only).
- Served bundle is `data.min.js`, regenerated from `data.js` by `scripts/minify-js.js` (esbuild) in `build.sh` — so
  only `data.js` is hand-edited.
- `--dur-pill-reveal` / `--ease-pill-reveal` apply **only** to `.pill-row[data-stagger] .brand-pill`, so retuning
  them is pill-scoped and safe.

## Changes — Part A: icon/colour correctness
- **Mockoon (wrong icon):** `public/assets/img/brands/mockoon.svg` actually contained the **Swagger** logo. Replaced
  with the official Mockoon "eyes" mark (from mockoon.com), flattened to a single charcoal `#242830` body + white
  eyes so it reads cleanly on the light glass pill. Glow `data.js` `#1997E8 → #242830`.
- **Gemini:** glow `#7c60a6 → #8E75B2` (matches its own logo / Simple-Icons hex). Glyph was already correct.
- **Kibana:** glow `#00A3E0 → #005571` (matches the `kibana.svg` logo).
- **Webpack:** logo `fill #8DD6F9 → #1C78C0` — the pale blue was near-invisible on the near-white pill.
- Minor same-family glow drifts (Vue/Express/Git/Copilot/OSM) left as-is — the darker glows are deliberate contrast
  choices, not errors.

## Changes — Part B: motion smoothing (reuse existing tokens)
Hover (`styles.css`, one pill at a time, desktop-only):
- **Glow no longer snaps:** `.brand-pill.spec::after` gained `transition: opacity 0.32s var(--ease-glass)` — the
  brand halo now fades in with the lift instead of popping instantly (the single most jarring element).
- **Sheen tamed:** band white `rgba(255,255,255,.9) → .55`, wider falloff (14%→84%), sweep `0.7s → 0.8s` — a gloss,
  not a glare.
- **Icon zoom unified:** `scale(1.08)@0.22s --ease-tile → scale(1.05)@0.3s --ease-glass`, so all hover layers settle
  on one ~0.3s curve.

Entrance (Skills pill-row stagger):
- **Softer attack:** `--ease-pill-reveal` `cubic-bezier(0.22,1,0.36,1)` (initial slope ≈4.5, "snap then float") →
  `cubic-bezier(0.33,1,0.68,1)` (easeOutCubic); `--dur-pill-reveal 0.72s → 0.82s`.
- **Calmer wave:** Skills row `data-stagger-step 85 → 62` (set on the row, not the global default).

## Perf / cross-browser
All entrance motion stays transform+opacity only; hover's single non-composited bit (`top`/`box-shadow`) is bounded
to one hovered pill and fully disabled under `@media (hover:none)` and `prefers-reduced-motion`. No `backdrop-filter`
or persistent `will-change` on any of the 114 pills. Sheen change reduces overdraw. Net perf profile unchanged.

## Verify
`./build.sh` (regenerates `data.min.js` + version hashes + SW). Serve; confirm: Mockoon shows the eyes mark (not
Swagger), Gemini/Kibana glows match their logos, Webpack logo is visible; hover glow fades (no pop), sheen is subtle,
pills ease in gently. Reduced-motion + touch still zero out hover/stagger.
