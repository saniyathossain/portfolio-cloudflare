#!/usr/bin/env node
/** Inject build hash into service worker for cache busting */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { computeHash } from "./lib/build-hash.ts";
import { logDone } from "./lib/console.ts";

const SERVICE_WORKER_SOURCE = join(import.meta.dirname, "..", "src/client/sw.ts"); // stamped in the TS source, then bundled to public/sw.js
const HASH_PLACEHOLDER = "__BUILD_HASH__";
const CACHE_VERSION_PATTERN = /const CACHE_VERSION = "[^"]+";/;

// Excludes only itself — the SW cache version must change whenever ANY other shipped asset
// changes (that's its whole purpose), so nothing else is excluded here.
const hash = computeHash(["sw.js"]);
let serviceWorkerSource = readFileSync(SERVICE_WORKER_SOURCE, "utf8");
if (serviceWorkerSource.includes(HASH_PLACEHOLDER)) {
  serviceWorkerSource = serviceWorkerSource.replaceAll(HASH_PLACEHOLDER, hash);
} else {
  serviceWorkerSource = serviceWorkerSource.replace(CACHE_VERSION_PATTERN, `const CACHE_VERSION = "${hash}";`);
}
writeFileSync(SERVICE_WORKER_SOURCE, serviceWorkerSource);
logDone(`Service worker cache version: ${hash}`);
