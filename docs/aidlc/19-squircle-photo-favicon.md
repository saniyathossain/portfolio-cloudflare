# 19 — Squircle-masked photo favicon with a copper ring

## Context
The favicon was a full square crop of the portrait — fine large, **mud at 16–32px**. Keep the photo but reshape it
into a macOS **squircle** (superellipse) with a subtle **copper ring**, so it reads as a crafted app-icon and holds
identity at tiny sizes. On-brand (copper `--accent #b15f2c`, Tahoe glass), no new requests, CSP `self` intact,
deterministic/idempotent (per doc 18).

Toolchain is `sips`+`cwebp` only (no ImageMagick / SVG rasterizer), so the crisp dependency-free path is a
**generated SVG favicon**: squircle + ring are vector (sharp at any size); the photo is embedded as a data-URI and
**top-framed to the face** via SVG `preserveAspectRatio`.

## Changes
### `scripts/optimize-images.js` — `faviconSvg()`
Inside the hero-derivative block (guarded by `needsGen(HERO, […])`): `sips -Z 220` the master → small full-aspect
PNG → base64 → write `public/assets/img/favicon.svg` (viewBox `0 0 100 100`):
- `<clipPath>` = superellipse squircle path.
- `<image … preserveAspectRatio="xMidYMin slice" clip-path="url(#sq)">` — cover-fit, **top-anchored** so the face
  shows.
- Copper ring: squircle path stroked `#b15f2c` (inset) + faint inner white highlight for the glass pop.
- Temp PNG deleted; fixed SVG string + stable base64 → byte-identical across builds unless the master changes.
`favicon.svg` added to the `needsGen(HERO, …)` output list.

### `scripts/sync-head.js` — icon links
```
<link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
```
Modern browsers → squircle SVG; older → square `favicon-32.png`; iOS → `apple-touch-icon.png`.

## Verify
`./build.sh` twice → `favicon.svg` shasum identical (idempotent); `curl -I` → `200 image/svg+xml`; browser tab shows
squircle face + copper ring, crisp at 16px; master JPEG untouched.
