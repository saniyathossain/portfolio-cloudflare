/**
 * `Link` preload hints sent with every HTML response so the browser starts the hero image, CSS and font before it
 * has parsed the page (docs/aidlc/43). The `?v=` stamps are rewritten by scripts/set-asset-version.js on every build.
 */
const HERO_WIDTHS = [480, 760, 840, 900, 1300, 1800] as const;
const HERO_SRCSET = HERO_WIDTHS.map((width) => `/assets/img/saniyat-hossain-${width}.webp ${width}w`).join(", ");

export const EARLY_HINTS: string = [
  `</assets/img/saniyat-hossain-480.webp>; rel=preload; as=image; type=image/webp; fetchpriority=high; imagesrcset="${HERO_SRCSET}"; imagesizes="(min-width: 1024px) 62vw, 100vw"`,
  "</assets/css/styles.min.css?v=e2cf15b0b9ba>; rel=preload; as=style",
  "</assets/img/bismillah.svg?v=e2cf15b0b9ba>; rel=preload; as=image; type=image/svg+xml",
  "</assets/fonts/inter-latin.woff2>; rel=preload; as=font; type=font/woff2; crossorigin",
].join(", ");
