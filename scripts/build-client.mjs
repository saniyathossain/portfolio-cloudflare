#!/usr/bin/env node
/**
 * Bundles the browser TypeScript in src/client/*.ts into public/assets/js/<name>.min.js (one self-contained IIFE per
 * entry, minified). It replaces the old "hand-written JS → minify-js.js" step for every converted file (docs/aidlc/60).
 * Files under src/client/lib/ are shared modules, not entries. Runs before set-asset-version.js so the content hash
 * covers the freshly generated bundles.
 */
import { readdirSync, rmSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { build } from "esbuild";

const ROOT = new URL("..", import.meta.url).pathname;
const SOURCE_DIR = join(ROOT, "src/client");
const OUTPUT_DIR = join(ROOT, "public/assets/js");

const entries = readdirSync(SOURCE_DIR)
  .filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"))
  .map((file) => join(SOURCE_DIR, file));

// Bundles whose TypeScript entry no longer exists must not linger in public/ (and so in dist/ and production).
const expected = new Set(entries.map((entry) => `${basename(entry, ".ts")}.min.js`));
for (const file of readdirSync(OUTPUT_DIR)) {
  if (file.endsWith(".min.js") && !expected.has(file)) rmSync(join(OUTPUT_DIR, file));
}

let totalBytes = 0;
for (const entry of entries) {
  const name = basename(entry, ".ts");
  // The service worker must be served from the site root as /sw.js; every other entry is an asset bundle.
  const outfile = name === "sw" ? join(ROOT, "public/sw.js") : join(OUTPUT_DIR, `${name}.min.js`);
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "iife",
    minify: true,
    target: "es2019",
    legalComments: "none",
    logLevel: "warning",
  });
  totalBytes += statSync(outfile).size;
}
console.log(`build-client: ${entries.length} bundles, ${totalBytes}B`);
