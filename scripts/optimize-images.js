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

function icon(src, dest, size) {
  if (!fs.existsSync(src)) return;
  if (has("sips")) {
    execSync(`sips -z ${size} ${size} "${src}" --out "${dest}"`, { stdio: "ignore" });
    console.log("Icon:", dest, `(${size}px)`);
  } else if (has("magick")) {
    execSync(
      `magick "${src}" -resize ${size}x${size} -gravity center -extent ${size}x${size} "${dest}"`,
      { stdio: "ignore" }
    );
    console.log("Icon:", dest);
  }
}

/** Square PNG favicon fallback (centre-crop to square first — no squish — then resize). */
function favicon(src, dest, size) {
  if (!fs.existsSync(src)) return;
  if (has("sips")) {
    const tmp = dest + ".sq.jpg";
    execSync(`sips -c 900 900 "${src}" --out "${tmp}"`, { stdio: "ignore" });
    execSync(`sips -z ${size} ${size} "${tmp}" --out "${dest}"`, { stdio: "ignore" });
    fs.rmSync(tmp, { force: true });
    console.log("Favicon:", dest, `(${size}px)`);
  } else if (has("magick")) {
    execSync(
      `magick "${src}" -gravity north -extent 900x900 -resize ${size}x${size} "${dest}"`,
      { stdio: "ignore" }
    );
    console.log("Favicon:", dest);
  }
}

// Squircle (superellipse) tile path in a 100×100 box, R≈47, and an inner highlight at R≈44.
const SQ = "M50,3 C83,3 97,17 97,50 C97,83 83,97 50,97 C17,97 3,83 3,50 C3,17 17,3 50,3 Z";
const SQ_IN = "M50,6 C81,6 94,19 94,50 C94,81 81,94 50,94 C19,94 6,81 6,50 C6,19 19,6 50,6 Z";

/** Primary favicon: the portrait masked into a Tahoe squircle with a copper ring.
 *  The photo is embedded (data-URI) and top-framed to the face via preserveAspectRatio. */
function faviconSvg(src, dest) {
  if (!fs.existsSync(src) || !has("sips")) return;
  const tmp = dest + ".src.png";
  execSync(`sips -Z 160 -s format png "${src}" --out "${tmp}"`, { stdio: "ignore" });
  const b64 = fs.readFileSync(tmp).toString("base64");
  fs.rmSync(tmp, { force: true });
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><clipPath id="sq"><path d="${SQ}"/></clipPath></defs>` +
    `<image href="data:image/png;base64,${b64}" x="0" y="0" width="100" height="100" ` +
    `preserveAspectRatio="xMidYMin slice" clip-path="url(#sq)"/>` +
    `<path d="${SQ_IN}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.5"/>` +
    `<path d="${SQ}" fill="none" stroke="#b15f2c" stroke-width="5"/>` +
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

// ── Hero: WebP + PWA icons, all derived from the immutable master JPEG ─────────
const heroWebp = path.join(IMG, "saniyat-hossain.webp");
const apple = path.join(IMG, "apple-touch-icon.png");
const i192 = path.join(IMG, "icon-192.png");
const i512 = path.join(IMG, "icon-512.png");
const fav32 = path.join(IMG, "favicon-32.png");
const favSvg = path.join(IMG, "favicon.svg");
if (needsGen(HERO, [heroWebp, apple, i192, i512, fav32, favSvg])) {
  webp(HERO, heroWebp, 82);
  icon(HERO, apple, 180);
  icon(HERO, i192, 192);
  icon(HERO, i512, 512);
  favicon(HERO, fav32, 32);
  faviconSvg(HERO, favSvg);
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
