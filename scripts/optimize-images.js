#!/usr/bin/env node
/** Generate WebP + PWA icons from the committed master images.
 *  The source JPEGs are treated as immutable masters — never re-encoded in place — so there is no
 *  cumulative generation loss. Derivatives are regenerated only when their source content changes
 *  (tracked in a gitignored .img-cache.json), so a no-op build produces no git churn. */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const IMG = path.join(ROOT, "public/assets/img");
const HERO = path.join(IMG, "saniyat-hossain.jpg");
const OG = path.join(IMG, "og-image.jpg");
const CACHE = path.join(__dirname, ".img-cache.json");

function has(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function webp(src, dest, q) {
  if (!fs.existsSync(src)) return;
  if (has("cwebp")) {
    execSync(`cwebp -q ${q} "${src}" -o "${dest}"`, { stdio: "ignore" });
    console.log("WebP:", dest);
    return;
  }
  console.warn("WARN: cwebp not found — skip", dest);
}

/** WebP resized to `width` (long edge), for the hero's responsive srcset. */
function webpResized(src, dest, width, q) {
  if (!fs.existsSync(src)) return;
  if (has("cwebp")) {
    execSync(`cwebp -q ${q} -resize ${width} 0 "${src}" -o "${dest}"`, { stdio: "ignore" });
    console.log("WebP:", dest, `(${width}w)`);
    return;
  }
  console.warn("WARN: cwebp not found — skip", dest);
}

const RING_COLOR = "#b15f2c";

/** Face-centered square crop (full color — no duotone/silhouette treatment) via ImageMagick.
 *  Crop rect is expressed as fractions of the source so it stays correct if the master photo
 *  changes: the head (profile, facing right) sits left-of-center in the 3000x4000 source. */
function faceCrop(src, dest) {
  if (!fs.existsSync(src) || !has("magick")) return null;
  const dims = execSync(`magick identify -format "%w %h" "${src}"`).toString().trim().split(/\s+/);
  const w = parseInt(dims[0], 10);
  const h = parseInt(dims[1], 10);
  const side = Math.round(w * 0.693);
  const x = Math.round(w * 0.067);
  const y = Math.round(h * 0.13);
  execSync(`magick "${src}" -crop ${side}x${side}+${x}+${y} +repage "${dest}"`, { stdio: "ignore" });
  console.log("Face crop:", dest, `(${side}x${side} @ ${x},${y})`);
  return dest;
}

/** Square PNG favicon fallback, resized from the face crop (OS applies its own icon rounding —
 *  no circle baked in here, matching platform convention for apple-touch/PWA icons). */
function favicon(cropSrc, dest, size) {
  if (!cropSrc || !fs.existsSync(cropSrc)) return;
  if (has("sips")) {
    execSync(`sips -z ${size} ${size} "${cropSrc}" --out "${dest}"`, { stdio: "ignore" });
  } else if (has("magick")) {
    execSync(`magick "${cropSrc}" -resize ${size}x${size} "${dest}"`, { stdio: "ignore" });
  }
  console.log("Favicon:", dest, `(${size}px)`);
}

/** Primary favicon: the face-centered portrait masked into a true circle with a thin copper ring. */
function faviconSvg(cropSrc, dest) {
  if (!cropSrc || !fs.existsSync(cropSrc)) return;
  const tmp = dest + ".src.jpg";
  if (has("sips")) {
    execSync(`sips -Z 200 -s format jpeg "${cropSrc}" --out "${tmp}"`, { stdio: "ignore" });
  } else if (has("magick")) {
    execSync(`magick "${cropSrc}" -resize 200x200 "${tmp}"`, { stdio: "ignore" });
  } else {
    return;
  }
  const b64 = fs.readFileSync(tmp).toString("base64");
  fs.rmSync(tmp, { force: true });
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><clipPath id="c"><circle cx="50" cy="50" r="46"/></clipPath></defs>` +
    `<image href="data:image/jpeg;base64,${b64}" x="0" y="0" width="100" height="100" ` +
    `preserveAspectRatio="xMidYMid slice" clip-path="url(#c)"/>` +
    `<circle cx="50" cy="50" r="46" fill="none" stroke="${RING_COLOR}" stroke-width="2"/>` +
    `</svg>\n`;
  fs.writeFileSync(dest, svg);
  console.log("Favicon SVG:", dest);
}

// ── Idempotency cache: skip regeneration when the source is unchanged ──────────
function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE, "utf8"));
  } catch {
    return {};
  }
}
function hashFile(f) {
  return crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
}
const cache = loadCache();

/** True when `src` must be (re)processed: it exists AND (its hash changed OR an output is missing). */
function needsGen(src, outs) {
  if (!fs.existsSync(src)) return false;
  const key = path.relative(ROOT, src);
  return cache[key] !== hashFile(src) || !outs.every((o) => fs.existsSync(o));
}
function record(src) {
  cache[path.relative(ROOT, src)] = hashFile(src);
}

// ── Hero: responsive WebP srcset + PWA icons, all derived from the immutable master JPEG ───────
// Widths cover mobile 1x/2x and the desktop 62vw-wide backdrop at 2x, so the browser never has to
// download more than ~1.5-2x its rendered pixel count (was: always the full 3000x4000 master).
const HERO_WIDTHS = [480, 900, 1300, 1800];
const heroSrcset = HERO_WIDTHS.map((w) => path.join(IMG, `saniyat-hossain-${w}.webp`));
const heroWebp = path.join(IMG, "saniyat-hossain.webp"); // 900w alias — plain <img src> fallback
const apple = path.join(IMG, "apple-touch-icon.png");
const i192 = path.join(IMG, "icon-192.png");
const i512 = path.join(IMG, "icon-512.png");
const fav32 = path.join(IMG, "favicon-32.png");
const favSvg = path.join(IMG, "favicon.svg");
const faceCropTmp = path.join(IMG, ".face-crop-tmp.jpg");
if (needsGen(HERO, [...heroSrcset, heroWebp, apple, i192, i512, fav32, favSvg])) {
  for (const w of HERO_WIDTHS) {
    webpResized(HERO, path.join(IMG, `saniyat-hossain-${w}.webp`), w, 82);
  }
  fs.copyFileSync(path.join(IMG, "saniyat-hossain-900.webp"), heroWebp);
  console.log("WebP:", heroWebp, "(900w alias)");

  const crop = faceCrop(HERO, faceCropTmp);
  if (crop) {
    favicon(crop, fav32, 32);
    favicon(crop, apple, 180);
    favicon(crop, i192, 192);
    favicon(crop, i512, 512);
    faviconSvg(crop, favSvg);
    fs.rmSync(crop, { force: true });
  } else {
    console.warn("WARN: ImageMagick (`magick`) not found — skipping favicon/icon regeneration.");
    console.warn("       Install with `brew install imagemagick` for the face-centered crop.");
  }
  record(HERO);
} else {
  console.log("Hero derivatives up to date — skipped.");
}

// ── OG image → WebP ───────────────────────────────────────────────────────────
const ogWebp = path.join(IMG, "og-image.webp");
if (needsGen(OG, [ogWebp])) {
  webp(OG, ogWebp, 85);
  record(OG);
} else {
  console.log("OG derivative up to date — skipped.");
}

fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2) + "\n");
console.log("Image optimization done.");
