#!/usr/bin/env node
/** Inject build hash into service worker for cache busting */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const SW = path.join(ROOT, "public/sw.js");
const hash = crypto.createHash("sha256").update(String(Date.now())).digest("hex").slice(0, 12);
let sw = fs.readFileSync(SW, "utf8");
if (sw.includes("__BUILD_HASH__")) {
  sw = sw.replace(/__BUILD_HASH__/g, hash);
} else {
  sw = sw.replace(/const CACHE_VERSION = "[^"]+";/, `const CACHE_VERSION = "${hash}";`);
}
fs.writeFileSync(SW, sw);
console.log("Service worker cache version:", hash);
