#!/usr/bin/env node
/** Stamp a content-derived cache-busting version (?v=) into boot.js — replaces the old habit of
 *  hand-bumping a literal "uplift-N" string, which is exactly how a real bug shipped: CSS edits
 *  landed after the last manual bump, so the version never changed and browsers kept serving stale
 *  cached CSS under the Worker's `immutable, max-age=1yr` header. This runs every `./build.sh`, so
 *  the version always reflects the actual current content — no manual step to forget.
 *
 *  index.html and boot.js itself are excluded from the hash: both hold a *copy* of this value, so
 *  including them would make the hash never converge (each run's injected value changes the next
 *  run's input). boot.min.js is excluded for the same reason — minify-js.js (which runs after this
 *  script, see build.sh) bakes the just-stamped ASSET_V into it too. sw.js is excluded too — it has
 *  its own independent content hash (hash-sw.js) for a different purpose (service worker cache
 *  invalidation) and shouldn't feed into this one.
 */
const fs = require("fs");
const path = require("path");
const { computeHash, PUBLIC } = require("./lib/build-hash");

const ROOT = path.join(__dirname, "..");
const BOOT = path.join(PUBLIC, "assets/js/boot.js");
const WORKER = path.join(ROOT, "src/index.js");

const hash = computeHash(["index.html", "assets/js/boot.js", "assets/js/boot.min.js", "sw.js"]);

let boot = fs.readFileSync(BOOT, "utf8");
boot = boot.replace(/const ASSET_V = "[^"]+";/, `const ASSET_V = "${hash}";`);
fs.writeFileSync(BOOT, boot);

// src/index.js is the Worker source (not under public/, not part of the hash) — its Early Hints
// preloads for styles.min.css and bismillah.svg need the same version so they point at the files
// the browser will actually request.
let worker = fs.readFileSync(WORKER, "utf8");
worker = worker.replace(/styles\.min\.css\?v=[^>]+>/, `styles.min.css?v=${hash}>`);
worker = worker.replace(/bismillah\.svg\?v=[^>]+>/, `bismillah.svg?v=${hash}>`);
fs.writeFileSync(WORKER, worker);

console.log("Asset version:", hash);

module.exports = { hash };
