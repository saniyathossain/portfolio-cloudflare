#!/usr/bin/env node
/** Generate WebP + PWA icons (via sharp — no ImageMagick/cwebp/sips needed) from the committed master images.
 *  The source JPEGs are treated as immutable masters — never re-encoded in place — so there is no
 *  cumulative generation loss. Derivatives are regenerated only when their source content changes
 *  (tracked in a gitignored .img-cache.json), so a no-op build produces no git churn. */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import sharp from "sharp";
import { logDone, logInfo } from "./lib/console.ts";

const ROOT = join(import.meta.dirname, "..");
const IMG = join(ROOT, "public/assets/img");
const HERO = join(IMG, "saniyat-hossain.jpg");
const CACHE_PATH = join(import.meta.dirname, ".img-cache.json");

const RING_COLOR = "#b15f2c";
const HERO_WEBP_QUALITY = 82;
const LOGO_WEBP_QUALITY = 88;
const HERO_ALIAS_WIDTH = 900; // the plain <img src> fallback is the 900w rendition
// Face crop rect as fractions of the source so it stays correct if the master photo changes: the head
// (profile, facing right) sits left-of-center in the 3000x4000 source.
const FACE_CROP_SIDE_RATIO = 0.693;
const FACE_CROP_X_RATIO = 0.067;
const FACE_CROP_Y_RATIO = 0.13;
const FAVICON_SVG_SOURCE_PX = 200;
const FAVICON_SVG_ENCODED_BASE_PX = 100;
const FAVICON_JPEG_QUALITY = 85;

// ── Hero: responsive WebP srcset + PWA icons, all derived from the immutable master JPEG ───────
// Widths cover mobile 1x/2x and the desktop 62vw-wide backdrop at 2x, so the browser never has to
// download more than ~1.5-2x its rendered pixel count (was: always the full 3000x4000 master).
// 760 added: a 2x-DPR mobile phone (~360-390px CSS width) needs ~720-780px and was jumping straight
// from 480w past that need to 900w — confirmed via live Lighthouse image-delivery-insight as ~31KB
// wasted on mobile. (760, not 720: Lighthouse's mobile emulation is 412x1.75dpr = 721px, so a 720w
// candidate lost the srcset pick by 1px — 760w clears it with margin.)
// 840 added: the 62vw desktop backdrop at Lighthouse's 1350px desktop preset (DPR 1) renders at
// 828px — 760w falls short and 900w overshoots by ~30KB (confirmed via live uses-responsive-images).
// 840w clears the 828px need with margin, same "don't lose the pick by a handful of px" lesson as 760.
const HERO_WIDTHS: readonly number[] = [480, 760, 840, 900, 1300, 1800];

// ── Company/school logos → resized WebP ───────────────────────────────────────
// Several master PNGs (exported at arbitrary source resolution) were shipped as-is and rendered at
// 16-28px — e.g. a 512x512 st-joseph.png for a `width="28"` <img>, and a 211x211 motijheel-school.png
// that happened to be a very poorly-compressed PNG (100KB for 211px). Resize to the largest actual
// on-page size (28px — index.html's exp-group__logo/edu-row__logo `width` attribute) at ~3.4x retina
// headroom (96px), then re-encode as WebP. SVG logos (brainstation-23, grameenphone, runnercyberlink)
// are already vector — left alone. portfolio.json references the .webp output directly; the PNG
// masters stay as the source of truth — DO NOT delete them as "unused" (a prior cleanup pass did
// exactly that, since nothing in HTML/CSS/JS references the .png filenames directly — they're only
// referenced here, as build-time sources; always grep this script too before deleting an asset).
const LOGOS_DIR = join(IMG, "logos");
// 96 (not the old 192): confirmed via live Lighthouse image-delivery-insight that 192px wasted ~18KB
// on a 96%-oversized icddrb-official.webp — the real max on-page display is 28px, not 48px.
const LOGO_MAX_WIDTH = 96;
const LOGO_PNGS: readonly string[] = [
  "icddrb-official.png",
  "oss-official-transparent.png",
  "east-west-university.png",
  "st-joseph.png",
  "motijheel-school.png",
];

type ImageCache = Record<string, string>;

function isImageCache(value: unknown): value is ImageCache {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

/** WebP resized to `width` (long edge), for the hero's responsive srcset. Metadata is stripped (sharp's default). */
async function writeResizedWebp(source: string, destination: string, width: number, quality: number): Promise<void> {
  if (!existsSync(source)) return;
  await sharp(source).resize({ width }).webp({ quality }).toFile(destination);
  logDone(`WebP: ${destination} (${width}w)`);
}

/** Face-centered square crop (full color — no duotone/silhouette treatment), kept lossless in memory.
 *  Crop rect is expressed as fractions of the source so it stays correct if the master photo changes. */
async function readFaceCrop(source: string): Promise<Buffer | null> {
  if (!existsSync(source)) return null;
  const { width: sourceWidth, height: sourceHeight } = await sharp(source).metadata();
  const side = Math.round(sourceWidth * FACE_CROP_SIDE_RATIO);
  const left = Math.round(sourceWidth * FACE_CROP_X_RATIO);
  const top = Math.round(sourceHeight * FACE_CROP_Y_RATIO);
  const crop = await sharp(source).extract({ left, top, width: side, height: side }).png().toBuffer();
  logDone(`Face crop: ${side}x${side} @ ${left},${top}`);
  return crop;
}

/** Square PNG favicon fallback, resized from the face crop (OS applies its own icon rounding —
 *  no circle baked in here, matching platform convention for apple-touch/PWA icons). */
async function writeSquareIcon(faceCrop: Buffer, destination: string, sizePx: number): Promise<void> {
  await sharp(faceCrop).resize(sizePx, sizePx).png().toFile(destination);
  logDone(`Favicon: ${destination} (${sizePx}px)`);
}

/** Primary favicon: the face-centered portrait masked into a true circle with a thin copper ring. */
async function writeFaviconSvg(faceCrop: Buffer, destination: string): Promise<void> {
  const jpeg = await sharp(faceCrop)
    .resize(FAVICON_SVG_SOURCE_PX, FAVICON_SVG_SOURCE_PX)
    .jpeg({ quality: FAVICON_JPEG_QUALITY })
    .toBuffer();
  const encodedImage = jpeg.toString("base64");
  const center = FAVICON_SVG_ENCODED_BASE_PX / 2;
  const radius = 46;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><clipPath id="c"><circle cx="${center}" cy="${center}" r="${radius}"/></clipPath></defs>` +
    `<image href="data:image/jpeg;base64,${encodedImage}" x="0" y="0" width="100" height="100" ` +
    `preserveAspectRatio="xMidYMid slice" clip-path="url(#c)"/>` +
    `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${RING_COLOR}" stroke-width="2"/>` +
    `</svg>\n`;
  writeFileSync(destination, svg);
  logDone(`Favicon SVG: ${destination}`);
}

// ── Idempotency cache: skip regeneration when the source is unchanged ──────────
function loadCache(): ImageCache {
  try {
    const parsed: unknown = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
    return isImageCache(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function hashFile(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

const cache = loadCache();

/** True when `source` must be (re)processed: it exists AND (its hash changed OR an output is missing). */
function needsGeneration(source: string, outputs: readonly string[]): boolean {
  if (!existsSync(source)) return false;
  return cache[relative(ROOT, source)] !== hashFile(source) || !outputs.every((output) => existsSync(output));
}

function recordSource(source: string): void {
  cache[relative(ROOT, source)] = hashFile(source);
}

async function generateHeroDerivatives(): Promise<void> {
  const heroSrcset = HERO_WIDTHS.map((width) => join(IMG, `saniyat-hossain-${width}.webp`));
  const heroWebp = join(IMG, "saniyat-hossain.webp"); // 900w alias — plain <img src> fallback
  const appleTouchIcon = join(IMG, "apple-touch-icon.png");
  const icon192 = join(IMG, "icon-192.png");
  const icon512 = join(IMG, "icon-512.png");
  const favicon32 = join(IMG, "favicon-32.png");
  const faviconSvg = join(IMG, "favicon.svg");

  const outputs = [...heroSrcset, heroWebp, appleTouchIcon, icon192, icon512, favicon32, faviconSvg];
  if (!needsGeneration(HERO, outputs)) {
    logInfo("Hero derivatives up to date — skipped.");
    return;
  }
  for (const width of HERO_WIDTHS) {
    await writeResizedWebp(HERO, join(IMG, `saniyat-hossain-${width}.webp`), width, HERO_WEBP_QUALITY);
  }
  copyFileSync(join(IMG, `saniyat-hossain-${HERO_ALIAS_WIDTH}.webp`), heroWebp);
  logDone(`WebP: ${heroWebp} (${HERO_ALIAS_WIDTH}w alias)`);

  const faceCrop = await readFaceCrop(HERO);
  if (faceCrop) {
    await writeSquareIcon(faceCrop, favicon32, 32);
    await writeSquareIcon(faceCrop, appleTouchIcon, 180);
    await writeSquareIcon(faceCrop, icon192, 192);
    await writeSquareIcon(faceCrop, icon512, 512);
    await writeFaviconSvg(faceCrop, faviconSvg);
  }
  recordSource(HERO);
}

async function generateLogoDerivatives(): Promise<void> {
  for (const name of LOGO_PNGS) {
    const source = join(LOGOS_DIR, name);
    const destination = join(LOGOS_DIR, name.replace(/\.png$/, ".webp"));
    if (!needsGeneration(source, [destination])) {
      logInfo(`Logo derivative up to date — skipped: ${name}`);
      continue;
    }
    if (!existsSync(source)) continue;
    // `withoutEnlargement` keeps a source narrower than the target at native size — upscaling is strictly
    // worse (blurrier AND bigger than just re-encoding).
    const image = sharp(source).resize({ width: LOGO_MAX_WIDTH, withoutEnlargement: true });
    await image.webp({ quality: LOGO_WEBP_QUALITY }).toFile(destination);
    logDone(`Logo WebP: ${destination} (≤${LOGO_MAX_WIDTH}w)`);
    recordSource(source);
  }
}

await generateHeroDerivatives();
await generateLogoDerivatives();

writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
logDone("Image optimization done.");
