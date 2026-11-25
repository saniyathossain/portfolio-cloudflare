#!/usr/bin/env node
/**
 * Ship-gate self-check — catches the exact class of bug that has twice slipped through undetected
 * (an unbalanced brace in critical.css breaking the inlined <head> <style>, via truncation) before
 * a deploy ships it. Read-only; exits non-zero on any structural defect so deploy.sh stops early.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { logDone, logError } from "./lib/console.ts";

const ROOT = resolve(import.meta.dirname, "..");
const HTML_PATH = resolve(ROOT, "src/legacy/index.html");
const IMG_SNIPPET_LENGTH = 80;
const VOID_ELEMENTS: ReadonlySet<string> = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr",
]);

const html = readFileSync(HTML_PATH, "utf8");
const failures: string[] = [];

function fail(message: string): void {
  logError(`PREFLIGHT FAIL: ${message}`);
  failures.push(message);
}

function countOccurrences(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

// 1) Inline critical <style> brace balance — the bug that shipped twice before.
const styleMatch = /<style>([\s\S]*?)<\/style>/.exec(html);
if (!styleMatch) {
  fail("no inline <style> block found in <head>");
} else {
  const css = styleMatch[1] ?? "";
  const openBraces = countOccurrences(css, /{/g);
  const closeBraces = countOccurrences(css, /}/g);
  if (openBraces !== closeBraces) {
    fail(`inline <style> brace mismatch — ${openBraces} open vs ${closeBraces} close ("} expected" class of bug)`);
  }
}

// Strip HTML comments, then <script>...</script> and <style>...</style> bodies before tag-balance
// scanning. Comments must go first — several doc comments in this file reference "<style>"/"<script>"
// by name (explaining why an element is invisible via the critical inline style block), and without
// stripping comments first, that literal text false-matches the style/script open-tag regex below,
// throwing off the whole-document tag stack. Script/style bodies still need their own strip after
// that: their JS/CSS content routinely contains bare `<`/`>` (comparisons, template-literal HTML
// strings) that a tag-regex can't tell apart from real markup.
const htmlForTags = html
  .replace(/<!--[\s\S]*?-->/g, "<!---->")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "<script></script>")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "<style></style>");

// 2) HTML tag balance (ignoring void elements) across the whole document.
function checkTagBalance(markup: string): void {
  const openTagStack: string[] = [];
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  for (const tagMatch of markup.matchAll(tagPattern)) {
    const [fullTag, tagName = "", selfClose] = tagMatch;
    const lowerTagName = tagName.toLowerCase();
    if (VOID_ELEMENTS.has(lowerTagName)) continue;
    if (fullTag.startsWith("</")) closeTag(openTagStack, lowerTagName);
    else if (!selfClose) openTagStack.push(lowerTagName);
  }
  if (openTagStack.length) fail(`unclosed tags at EOF: ${openTagStack.join(", ")}`);
}

function closeTag(openTagStack: string[], closingTagName: string): void {
  const expectedTagName = openTagStack.pop();
  if (expectedTagName === closingTagName) return;
  fail(`tag mismatch — expected </${expectedTagName}>, got </${closingTagName}>`);
  if (expectedTagName) openTagStack.push(expectedTagName); // best-effort resync
}

checkTagBalance(htmlForTags);

// 3) Every <img> has a static or bound alt.
for (const imageMatch of html.matchAll(/<img\b[^>]*>/g)) {
  const imageTag = imageMatch[0];
  if (!/\s:?alt=/.test(imageTag)) fail(`<img> missing alt: ${imageTag.slice(0, IMG_SNIPPET_LENGTH)}`);
}

if (failures.length) {
  logError("Preflight found structural defects — fix before shipping.");
  process.exit(1);
}
logDone("Preflight OK — head <style> balanced, HTML tags balanced, all <img> have alt.");
