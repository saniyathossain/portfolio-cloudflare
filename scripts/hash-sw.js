#!/usr/bin/env node
/** Inject build hash into service worker for cache busting */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const SW = path.join(ROOT, "public/sw.js");
const PUBLIC = path.join(ROOT, "public");

/** Deterministic hash over all shipped assets — changes only when a served asset changes.
 *  Skips sw.js itself and sourcemaps so the hash doesn't depend on its own output. */
function hashPublic() {
  const files = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const rel = path.relative(PUBLIC, full);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (rel !== "sw.js" && !full.endsWith(".map")) files.push(full);
    }
  })(PUBLIC);
  const h = crypto.createHash("sha256");
  for (const f of files) {
    h.update(path.relative(PUBLIC, f).replace(/\\/g, "/"));
    h.update(fs.readFileSync(f));
  }
  return h.digest("hex").slice(0, 12);
}

const hash = hashPublic();
let sw = fs.readFileSync(SW, "utf8");
if (sw.includes("__BUILD_HASH__")) {
  sw = sw.replace(/__BUILD_HASH__/g, hash);
} else {
  sw = sw.replace(/const CACHE_VERSION = "[^"]+";/, `const CACHE_VERSION = "${hash}";`);
}
fs.writeFileSync(SW, sw);
console.log("Service worker cache version:", hash);
