#!/usr/bin/env node
/**
 * Bundles the browser TypeScript in src/client/*.ts into public/assets/js/<name>.min.js (one self-contained IIFE per
 * entry, minified). It replaces the old "hand-written JS → minify-js.js" step for every converted file (docs/aidlc/60).
 * Files under src/client/lib/ are shared modules, not entries. Runs before set-asset-version.ts so the content hash
 * covers the freshly generated bundles.
 */
import { readdirSync, rmSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { build } from "esbuild";
import { logDone } from "./lib/console.ts";

const ROOT = join(import.meta.dirname, "..");
const SOURCE_DIR = join(ROOT, "src/client");
const OUTPUT_DIR = join(ROOT, "public/assets/js");
const SERVICE_WORKER_ENTRY = "sw";
const SERVICE_WORKER_OUTPUT = join(ROOT, "public/sw.js");
const BUNDLE_TARGET = "es2019";

const entryFiles = readdirSync(SOURCE_DIR)
  .filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"))
  .map((file) => join(SOURCE_DIR, file));

// Bundles whose TypeScript entry no longer exists must not linger in public/ (and so in dist/ and production).
const expectedBundles = new Set(entryFiles.map((entry) => `${basename(entry, ".ts")}.min.js`));
for (const file of readdirSync(OUTPUT_DIR)) {
  if (file.endsWith(".min.js") && !expectedBundles.has(file)) rmSync(join(OUTPUT_DIR, file));
}

let totalBytes = 0;
for (const entry of entryFiles) {
  const name = basename(entry, ".ts");
  // The service worker must be served from the site root as /sw.js; every other entry is an asset bundle.
  const outfile = name === SERVICE_WORKER_ENTRY ? SERVICE_WORKER_OUTPUT : join(OUTPUT_DIR, `${name}.min.js`);
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "iife",
    minify: true,
    target: BUNDLE_TARGET,
    legalComments: "none",
    logLevel: "warning",
  });
  totalBytes += statSync(outfile).size;
}
logDone(`build-client: ${entryFiles.length} bundles, ${totalBytes}B`);
