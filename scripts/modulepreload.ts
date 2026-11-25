#!/usr/bin/env node
/**
 * Post-build step: adds `<link rel="modulepreload">` for every module the page's islands need (docs/aidlc/72).
 *
 * Astro only discovers an island's chunks when its hydration directive fires (`client:idle` waits for an idle main thread,
 * ~0.5 s locally and ~3 s under PageSpeed's throttling) and then walks the import graph one hop at a time, which
 * PageSpeed reports as a long "network dependency tree". The chunks are tiny, so fetching them at parse time costs nothing
 * on the main thread and turns the chain into one parallel round trip. Hydration timing is unchanged. `fetchpriority=low`
 * keeps them from competing with the stylesheet, fonts and hero image.
 *
 *   node scripts/modulepreload.ts            # rewrites dist/index.html
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { logDone, logInfo, logWarn } from "./lib/console.ts";

const DIST = join(import.meta.dirname, "..", "dist");
const PAGE = join(DIST, "index.html");
const ASTRO_PREFIX = "/_astro/";
/** Directives that fire on their own; `client:visible` islands load on scroll and are left alone. */
const EAGER_DIRECTIVES: ReadonlySet<string> = new Set(["load", "idle", "media"]);
/** `import{a as e}from"./x.js"`, `export*from"./x.js"` and bare `import"./x.js"`, minified or not. */
const STATIC_IMPORT = /(?:^|[;}\s])(?:import|export)\s*(?:[^"'`;()]*?from\s*)?["'](\.\/[^"']+\.js)["']/g;

function attributeValue(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
}

function entryModules(html: string): string[] {
  const entries = new Set<string>();
  for (const [tag] of html.matchAll(/<astro-island\b[^>]*>/g)) {
    if (!EAGER_DIRECTIVES.has(attributeValue(tag, "client") ?? "")) continue;
    for (const name of ["component-url", "renderer-url"]) {
      const url = attributeValue(tag, name);
      if (url?.startsWith(ASTRO_PREFIX)) entries.add(url);
    }
  }
  for (const [, url] of html.matchAll(/<script\b[^>]*type="module"[^>]*\ssrc="([^"]+)"/g)) {
    if (url?.startsWith(ASTRO_PREFIX)) entries.add(url);
  }
  return [...entries];
}

/** Static (not dynamic `import()`) relative imports of one built chunk. */
function staticImports(url: string): string[] {
  const source = readFileSync(join(DIST, url), "utf8");
  return [...source.matchAll(STATIC_IMPORT)].map(
    ([, specifier]) => `${ASTRO_PREFIX}${(specifier ?? "").replace(/^\.\//, "")}`,
  );
}

function importGraph(entries: readonly string[]): string[] {
  const seen = new Set<string>();
  const queue = [...entries];
  for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
    if (seen.has(url)) continue;
    seen.add(url);
    queue.push(...staticImports(url));
  }
  return [...seen].sort();
}

const html = readFileSync(PAGE, "utf8");
if (html.includes('rel="modulepreload"')) {
  logInfo("modulepreload: already present — skipped");
  process.exit(0);
}
const modules = importGraph(entryModules(html));
if (modules.length === 0) {
  logWarn("modulepreload: no island modules found in dist/index.html — nothing added");
  process.exit(0);
}
const links = modules.map((url) => `<link rel="modulepreload" href="${url}" fetchpriority="low">`).join("");
const anchor = html.indexOf("</head>");
if (anchor === -1) {
  logWarn("modulepreload: no </head> in dist/index.html — nothing added");
  process.exit(0);
}
writeFileSync(PAGE, `${html.slice(0, anchor)}${links}${html.slice(anchor)}`);
logDone(`modulepreload: ${modules.length} island modules preloaded in dist/index.html`);
