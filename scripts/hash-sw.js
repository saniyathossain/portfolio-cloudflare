#!/usr/bin/env node
/** Inject build hash into service worker for cache busting */
const fs = require("fs");
const path = require("path");
const { computeHash, PUBLIC } = require("./lib/build-hash");

const SW = path.join(PUBLIC, "sw.js");

// Excludes only itself — the SW cache version must change whenever ANY other shipped asset
// changes (that's its whole purpose), so nothing else is excluded here.
const hash = computeHash(["sw.js"]);
let sw = fs.readFileSync(SW, "utf8");
if (sw.includes("__BUILD_HASH__")) {
  sw = sw.replace(/__BUILD_HASH__/g, hash);
} else {
  sw = sw.replace(/const CACHE_VERSION = "[^"]+";/, `const CACHE_VERSION = "${hash}";`);
}
fs.writeFileSync(SW, sw);
console.log("Service worker cache version:", hash);
