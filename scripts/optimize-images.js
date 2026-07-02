#!/usr/bin/env node
/** Resize/compress hero, generate WebP when cwebp available, create PWA icons via sips */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const IMG = path.join(__dirname, "../public/assets/img");
const HERO = path.join(IMG, "saniyat-hossain.jpg");
const OG = path.join(IMG, "og-image.jpg");

function has(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
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

if (fs.existsSync(HERO) && has("sips")) {
  execSync(`sips -Z 1600 -s format jpeg -s formatOptions 82 "${HERO}"`, { stdio: "ignore" });
  console.log("Optimized hero JPEG (max 1600px, q~82)");
}

webp(HERO, path.join(IMG, "saniyat-hossain.webp"), 82);
webp(OG, path.join(IMG, "og-image.webp"), 85);

const iconSrc = fs.existsSync(HERO) ? HERO : path.join(IMG, "favicon.svg");
if (fs.existsSync(HERO)) {
  icon(HERO, path.join(IMG, "apple-touch-icon.png"), 180);
  icon(HERO, path.join(IMG, "icon-192.png"), 192);
  icon(HERO, path.join(IMG, "icon-512.png"), 512);
}

console.log("Image optimization done.");
