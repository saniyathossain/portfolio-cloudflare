#!/usr/bin/env node
/**
 * Minify our own hand-written JS (source stays fully commented/readable; *.min.js is what
 * index.html/boot.js actually load — same source→dist split as styles.css → styles.min.css).
 *
 * Unlike CSS (minify-css.js hand-rolls its own whitespace/comment stripper — safe there because
 * CSS has no regex literals or division operators to confuse a naive tokenizer), several of these
 * files contain real regex literals (data.js) and `//` inside string literals (icons.js's SVG
 * xmlns URLs) — a hand-rolled comment stripper risks corrupting those. esbuild parses the AST
 * for real, so it can't make that mistake. Runs via `npx` (network at build time only, never at
 * runtime — same pattern build-css.sh already uses for the Tailwind CLI).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DIR = path.join(__dirname, "..", "public/assets/js");
const FILES = [
  "data.js", "icons.js", "loader.js", "boot.js",
  "app.js", "skills-flat.js", "reveal.js", "blur-reveal.js", "skills-scroll.js", "motion.js", "liquid-hero.js", "aurora.js",
];

let totalIn = 0;
let totalOut = 0;
for (const name of FILES) {
  const src = path.join(DIR, name);
  const out = path.join(DIR, name.replace(/\.js$/, ".min.js"));
  if (!fs.existsSync(src)) continue;
  execFileSync(
    "npx",
    ["--yes", "esbuild", src, "--minify", "--target=es2019", `--outfile=${out}`],
    { stdio: "inherit" }
  );
  totalIn += fs.statSync(src).size;
  totalOut += fs.statSync(out).size;
}

console.log(
  `minify-js: ${FILES.length} files ${totalIn}B → ${totalOut}B ` +
  `(${Math.round((1 - totalOut / totalIn) * 100)}% smaller)`
);
