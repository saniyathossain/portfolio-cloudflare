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
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "public/index.html"), "utf8");
let failed = false;

function fail(msg) {
  console.error("PREFLIGHT FAIL: " + msg);
  failed = true;
}

// 1) Inline critical <style> brace balance — the bug that shipped twice before.
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) {
  fail("no inline <style> block found in <head>");
} else {
  const css = styleMatch[1];
  const open = (css.match(/{/g) || []).length;
  const close = (css.match(/}/g) || []).length;
  if (open !== close) {
    fail(`inline <style> brace mismatch — ${open} open vs ${close} close ("} expected" class of bug)`);
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
const VOID = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
const stack = [];
const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
let m;
while ((m = tagRe.exec(htmlForTags))) {
  const [full, tag, selfClose] = m;
  const lower = tag.toLowerCase();
  if (full[1] === "!") continue;
  if (full.startsWith("</")) {
    if (VOID.has(lower)) continue;
    const top = stack.pop();
    if (top !== lower) {
      fail(`tag mismatch — expected </${top}>, got </${lower}>`);
      if (top) stack.push(top); // best-effort resync
    }
  } else if (!VOID.has(lower) && !selfClose) {
    stack.push(lower);
  }
}
if (stack.length) fail(`unclosed tags at EOF: ${stack.join(", ")}`);

// 3) Every <img> has a static or Alpine-bound alt.
const imgRe = /<img\b[^>]*>/g;
let im;
while ((im = imgRe.exec(html))) {
  if (!/\s:?alt=/.test(im[0])) fail(`<img> missing alt: ${im[0].slice(0, 80)}`);
}

if (failed) {
  console.error("\nPreflight found structural defects — fix before shipping.");
  process.exit(1);
}
console.log("Preflight OK — head <style> balanced, HTML tags balanced, all <img> have alt.");
