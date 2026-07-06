/** Deterministic content hash over public/ — shared by hash-sw.js (service worker cache version)
 *  and set-asset-version.js (?v= query-string cache-busting). Each caller passes its own `exclude`
 *  set: files that hold a *copy* of the hash's own output must be excluded, or the hash would never
 *  converge (run 1 writes hash A into the file, run 2 hashes that file's new content and gets hash
 *  B, forever, defeating "clean build = no diff").
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PUBLIC = path.join(__dirname, "..", "..", "public");

function computeHash(exclude) {
  const skip = new Set(exclude);
  const files = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const rel = path.relative(PUBLIC, full).replace(/\\/g, "/");
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (!skip.has(rel) && !full.endsWith(".map")) files.push(full);
    }
  })(PUBLIC);
  const h = crypto.createHash("sha256");
  for (const f of files) {
    h.update(path.relative(PUBLIC, f).replace(/\\/g, "/"));
    h.update(fs.readFileSync(f));
  }
  return h.digest("hex").slice(0, 12);
}

module.exports = { computeHash, PUBLIC };
