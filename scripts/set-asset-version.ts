#!/usr/bin/env node
/** Stamp a content-derived cache-busting version (?v=) into boot.ts — replaces the old habit of
 *  hand-bumping a literal "uplift-N" string, which is exactly how a real bug shipped: CSS edits
 *  landed after the last manual bump, so the version never changed and browsers kept serving stale
 *  cached CSS under the Worker's `immutable, max-age=1yr` header. This runs every `./build.sh`, so
 *  the version always reflects the actual current content — no manual step to forget.
 *
 *  index.html and boot.js itself are excluded from the hash: both hold a *copy* of this value, so
 *  including them would make the hash never converge (each run's injected value changes the next
 *  run's input). boot.min.js is excluded for the same reason — it bakes the just-stamped ASSET_V
 *  in. sw.js is excluded too — it has its own independent content hash (hash-sw.ts) for a different
 *  purpose (service worker cache invalidation) and shouldn't feed into this one.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { computeHash } from "./lib/build-hash.ts";
import { logDone } from "./lib/console.ts";

const ROOT = join(import.meta.dirname, "..");
const BOOT_SOURCE = join(ROOT, "src/client/boot.ts");
const EARLY_HINTS_SOURCE = join(ROOT, "src/worker/http/earlyHints.ts");
const HASH_EXCLUDES = ["index.html", "assets/js/boot.js", "assets/js/boot.min.js", "sw.js"];

export const hash = computeHash(HASH_EXCLUDES);

const bootSource = readFileSync(BOOT_SOURCE, "utf8").replace(/const ASSET_V = "[^"]+";/, `const ASSET_V = "${hash}";`);
writeFileSync(BOOT_SOURCE, bootSource);

// The Worker's Early Hints preloads for styles.min.css and bismillah.svg need the same version so
// they point at the files the browser will actually request.
const earlyHintsSource = readFileSync(EARLY_HINTS_SOURCE, "utf8")
  .replace(/styles\.min\.css\?v=[^>]+>/, `styles.min.css?v=${hash}>`)
  .replace(/bismillah\.svg\?v=[^>]+>/, `bismillah.svg?v=${hash}>`);
writeFileSync(EARLY_HINTS_SOURCE, earlyHintsSource);

logDone(`Asset version: ${hash}`);
