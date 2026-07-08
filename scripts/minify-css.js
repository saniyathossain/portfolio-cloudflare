#!/usr/bin/env node
/**
 * Conservative CSS minifier + bundler: tailwind.css + styles.css (source) → styles.min.css
 * (served). tailwind.css is folded in first (same cascade order as the old two-<link> setup, so
 * styles.css rules still win on specificity ties) — one stylesheet request instead of two.
 * Also: critical.css → critical.min.css (inlined by sync-head.js) + containment warnings if a
 * critical rule block is missing from styles.css.
 * Safe by design — strips /* *​/ comments and collapses whitespace runs to a SINGLE space,
 * never to zero. So semantic spaces survive: calc(a - b), descendant combinators (.a .b),
 * color-mix(in srgb, ...), and quoted strings / url() data-URIs are preserved verbatim.
 */
const fs = require("fs");
const path = require("path");

const CSS_DIR = path.join(__dirname, "..", "public/assets/css");
const TAILWIND_SRC = path.join(CSS_DIR, "tailwind.css");
const STYLES_SRC = path.join(CSS_DIR, "styles.css");
const STYLES_OUT = path.join(CSS_DIR, "styles.min.css");
const CRITICAL_SRC = path.join(CSS_DIR, "critical.css");
const CRITICAL_OUT = path.join(CSS_DIR, "critical.min.css");

function minifyCss(css) {
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

  return out.trim() + "\n";
}

function stripComments(css) {
  let out = "";
  let i = 0;
  const n = css.length;
  let str = null;
  while (i < n) {
    const c = css[i];
    if (!str && c === "/" && css[i + 1] === "*") {
      i += 2;
      while (i < n && !(css[i] === "*" && css[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (str) {
      out += c;
      if ((str === "'" || str === '"') && c === "\\") { out += css[i + 1] || ""; i += 2; continue; }
      if ((str === "'" || str === '"') && c === str) str = null;
      else if (str === "url" && c === ")") str = null;
      i++;
      continue;
    }
    if (c === "'" || c === '"') { str = c; out += c; i++; continue; }
    if ((c === "u" || c === "U") && /^url\(/i.test(css.substr(i, 4))) {
      out += css.substr(i, 4); i += 4;
      while (i < n && /\s/.test(css[i])) i++;
      if (css[i] !== "'" && css[i] !== '"') str = "url";
      continue;
    }
    out += c; i++;
  }
  return out;
}

/** Warn if distinctive body text from substantial critical rule blocks is missing in styles.css. */
function checkContainment(criticalSrc, stylesSrc) {
  const crit = stripComments(criticalSrc);
  // Collapse WS on both sides so probes survive formatting differences between extract + source.
  const stylesNorm = stylesSrc.replace(/\s+/g, " ");
  const blocks = [];
  let depth = 0;
  let start = 0;
  let str = null;
  for (let i = 0; i < crit.length; i++) {
    const c = crit[i];
    if (str) {
      if ((str === "'" || str === '"') && c === "\\") { i++; continue; }
      if ((str === "'" || str === '"') && c === str) str = null;
      else if (str === "url" && c === ")") str = null;
      continue;
    }
    if (c === "'" || c === '"') { str = c; continue; }
    if ((c === "u" || c === "U") && /^url\(/i.test(crit.substr(i, 4))) {
      i += 3;
      let j = i + 1;
      while (j < crit.length && /\s/.test(crit[j])) j++;
      if (crit[j] !== "'" && crit[j] !== '"') str = "url";
      continue;
    }
    if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        const open = start;
        let selStart = open;
        while (selStart > 0 && crit[selStart - 1] !== "}") selStart--;
        const selector = crit.slice(selStart, open).trim().replace(/\s+/g, " ");
        const body = crit.slice(open + 1, i).trim();
        if (body.length >= 24) blocks.push({ selector, body });
      }
    }
  }

  let warnings = 0;
  for (const { selector, body } of blocks) {
    const compact = body.replace(/\s+/g, " ").trim();
    let probe = compact;
    if (probe.length > 80) {
      const mid = Math.floor((probe.length - 48) / 2);
      probe = probe.slice(mid, mid + 48);
    }
    if (probe.length < 16) continue;
    if (!stylesNorm.includes(probe)) {
      warnings++;
      const label = selector.split(/\s*,\s*/)[0].slice(0, 60);
      console.warn(
        "WARNING: minify-css containment — critical rule not found in styles.css: " +
        label + " … probe=" + JSON.stringify(probe.slice(0, 40) + (probe.length > 40 ? "…" : ""))
      );
    }
  }
  if (warnings === 0) {
    console.log("minify-css: critical containment OK (" + blocks.length + " substantial blocks checked)");
  } else {
    console.warn("minify-css: critical containment — " + warnings + " WARNING(s)");
  }
}

const stylesSource = fs.readFileSync(STYLES_SRC, "utf8");
const tailwind = fs.existsSync(TAILWIND_SRC) ? fs.readFileSync(TAILWIND_SRC, "utf8") : "";
const bundle = tailwind + "\n" + stylesSource;
const stylesMin = minifyCss(bundle);
fs.writeFileSync(STYLES_OUT, stylesMin);
console.log(
  "minify-css: tailwind.css + styles.css " + bundle.length + "B → styles.min.css " + stylesMin.length + "B (" +
  Math.round((1 - stylesMin.length / bundle.length) * 100) + "% smaller)"
);

if (fs.existsSync(CRITICAL_SRC)) {
  const criticalSource = fs.readFileSync(CRITICAL_SRC, "utf8");
  checkContainment(criticalSource, stylesSource);
  const criticalMin = minifyCss(criticalSource);
  fs.writeFileSync(CRITICAL_OUT, criticalMin);
  console.log(
    "minify-css: critical.css " + criticalSource.length + "B → critical.min.css " + criticalMin.length + "B (" +
    Math.round((1 - criticalMin.length / criticalSource.length) * 100) + "% smaller)"
  );
} else {
  console.warn("WARNING: minify-css — critical.css missing; skipped critical.min.css");
}
