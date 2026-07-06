#!/usr/bin/env node
/**
 * Conservative CSS minifier + bundler: tailwind.css + styles.css (source) → styles.min.css
 * (served). tailwind.css is folded in first (same cascade order as the old two-<link> setup, so
 * styles.css rules still win on specificity ties) — one stylesheet request instead of two.
 * Safe by design — strips /* *​/ comments and collapses whitespace runs to a SINGLE space,
 * never to zero. So semantic spaces survive: calc(a - b), descendant combinators (.a .b),
 * color-mix(in srgb, ...), and quoted strings / url() data-URIs are preserved verbatim.
 */
const fs = require("fs");
const path = require("path");

const TAILWIND_SRC = path.join(__dirname, "..", "public/assets/css/tailwind.css");
const SRC = path.join(__dirname, "..", "public/assets/css/styles.css");
const OUT = path.join(__dirname, "..", "public/assets/css/styles.min.css");

const tailwind = fs.existsSync(TAILWIND_SRC) ? fs.readFileSync(TAILWIND_SRC, "utf8") : "";
const css = tailwind + "\n" + fs.readFileSync(SRC, "utf8");
const n = css.length;
let out = "";
let i = 0;
let str = null; // "'" | '"' | 'url' (unquoted url) while inside; null otherwise
let pendingSpace = false;

const isWS = (c) => c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f";

while (i < n) {
  const c = css[i];

  // comment (outside strings) → treat as whitespace
  if (!str && c === "/" && css[i + 1] === "*") {
    i += 2;
    while (i < n && !(css[i] === "*" && css[i + 1] === "/")) i++;
    i += 2;
    if (out && !isWS(out[out.length - 1])) pendingSpace = true;
    continue;
  }

  if (str) {
    out += c;
    if (str === "'" || str === '"') {
      if (c === "\\") { out += css[i + 1] || ""; i += 2; continue; }
      if (c === str) str = null;
    } else if (str === "url" && c === ")") {
      str = null;
    }
    i++;
    continue;
  }

  if (c === "'" || c === '"') {
    if (pendingSpace) { out += " "; pendingSpace = false; }
    str = c; out += c; i++; continue;
  }

  // url( … ) — quoted data-URIs fall through to normal string handling; unquoted are preserved verbatim
  if ((c === "u" || c === "U") && /^url\(/i.test(css.substr(i, 4))) {
    if (pendingSpace) { out += " "; pendingSpace = false; }
    out += css.substr(i, 4); i += 4;
    while (i < n && isWS(css[i])) i++;
    if (css[i] !== "'" && css[i] !== '"') str = "url";
    continue;
  }

  if (isWS(c)) { pendingSpace = true; i++; continue; }

  if (pendingSpace) { out += " "; pendingSpace = false; }
  out += c; i++;
}

out = out.trim() + "\n";
fs.writeFileSync(OUT, out);
console.log(
  "minify-css: tailwind.css + styles.css " + css.length + "B → styles.min.css " + out.length + "B (" +
  Math.round((1 - out.length / css.length) * 100) + "% smaller)"
);
