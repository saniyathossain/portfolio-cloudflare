#!/usr/bin/env node
/**
 * Post-build step: writes `dist/_csp.json`, the list of inline scripts the Worker may allow in `script-src` by hash instead of
 * `'unsafe-inline'` (docs/aidlc/73).
 *
 * It lists the SHA-256 of every executable inline `<script>` and every inline event-handler attribute (`onload="…"`) found in
 * the built HTML, plus the third-party script hosts the configured features need (Google Analytics, Turnstile). The Worker
 * fetches the file from the ASSETS binding, so hashes always match the HTML deployed alongside them.
 *
 *   node scripts/csp-manifest.ts            # run after astro build (and modulepreload)
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyBuildEnvironment } from "../src/lib/buildSettings.ts";
import { logDone } from "./lib/console.ts";

const ROOT = join(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const MANIFEST_PATH = join(DIST, "_csp.json");
const PORTFOLIO_PATH = join(ROOT, "public/assets/data/portfolio.json");

const TURNSTILE_HOST = "https://challenges.cloudflare.com";
const GOOGLE_TAG_HOST = "https://www.googletagmanager.com";
/** Script types that never execute, so CSP does not govern them (JSON-LD, `<script type="text/html">` templates, importmaps). */
const EXECUTABLE_TYPES: ReadonlySet<string> = new Set(["", "module", "text/javascript", "application/javascript"]);

function htmlFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith(".html") ? [path] : [];
  });
}

function sha256(text: string): string {
  return `sha256-${createHash("sha256").update(text, "utf8").digest("base64")}`;
}

function unescapeAttribute(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

const scriptHashes = new Set<string>();
const eventHandlerHashes = new Set<string>();
for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, "utf8");
  for (const [, attributes = "", body = ""] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\ssrc\s*=/.test(attributes)) continue;
    const type = /\stype\s*=\s*"([^"]*)"/.exec(attributes)?.[1]?.trim().toLowerCase() ?? "";
    if (EXECUTABLE_TYPES.has(type) && body.trim() !== "") scriptHashes.add(sha256(body));
  }
  for (const [tag] of html.matchAll(/<[a-z][^>]*>/gi)) {
    for (const [, , value = ""] of tag.matchAll(/\son[a-z]+\s*=\s*(["'])(.*?)\1/gi)) {
      eventHandlerHashes.add(sha256(unescapeAttribute(value)));
    }
  }
}

const portfolio = JSON.parse(readFileSync(PORTFOLIO_PATH, "utf8")) as {
  site: Parameters<typeof applyBuildEnvironment>[0];
};
const site = applyBuildEnvironment(portfolio.site, process.env);
const scriptHosts = [
  ...(site.turnstileSiteKey ? [TURNSTILE_HOST] : []),
  ...(site.analytics.googleId ? [GOOGLE_TAG_HOST] : []),
];

writeFileSync(
  MANIFEST_PATH,
  `${JSON.stringify({ scriptHashes: [...scriptHashes].sort(), eventHandlerHashes: [...eventHandlerHashes].sort(), scriptHosts })}\n`,
);
logDone(
  `csp-manifest: ${scriptHashes.size} inline scripts, ${eventHandlerHashes.size} event handlers, ${scriptHosts.length} script hosts → dist/_csp.json`,
);
