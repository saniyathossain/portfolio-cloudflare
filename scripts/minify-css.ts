#!/usr/bin/env node
/**
 * Conservative CSS minifier + bundler: tailwind.css + styles.css (source) → styles.min.css
 * (served). tailwind.css is folded in first (same cascade order as the old two-<link> setup, so
 * styles.css rules still win on specificity ties) — one stylesheet request instead of two.
 * Also: critical.css → critical.min.css (inlined by sync-head.ts) + containment warnings if a
 * critical rule block is missing from styles.css.
 * Safe by design — strips block comments and collapses whitespace runs to a SINGLE space,
 * never to zero. So semantic spaces survive: calc(a - b), descendant combinators (.a .b),
 * color-mix(in srgb, ...), and quoted strings / url() data-URIs are preserved verbatim.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { logDone, logWarn } from "./lib/console.ts";

const CSS_DIR = join(import.meta.dirname, "..", "public/assets/css");
const TAILWIND_SOURCE = join(CSS_DIR, "tailwind.css");
const STYLES_SOURCE = join(CSS_DIR, "styles.css");
const STYLES_OUTPUT = join(CSS_DIR, "styles.min.css");
const BRANDS_SOURCE = join(CSS_DIR, "brands.css");
const BRANDS_CRITICAL_SOURCE = join(CSS_DIR, "brands.critical.css");
const CRITICAL_SOURCE = join(CSS_DIR, "critical.css");
const CRITICAL_OUTPUT = join(CSS_DIR, "critical.min.css");

const URL_OPENER_LENGTH = 4;

type CssTokenKind = "comment" | "whitespace" | "string" | "url-open" | "url-body" | "other";

interface CssToken {
  kind: CssTokenKind;
  /** What to emit when the token is kept (a comment has none; `url(` drops the whitespace that follows it). */
  text: string;
  /** Offsets into the scanned source, so callers can slice the surrounding text. */
  start: number;
  end: number;
}

function isWhitespace(character: string | undefined): boolean {
  return character === " " || character === "\t" || character === "\n" || character === "\r" || character === "\f";
}

function isQuote(character: string | undefined): character is "'" | '"' {
  return character === "'" || character === '"';
}

function startsWithUrlOpener(css: string, index: number): boolean {
  return /^url\(/i.test(css.slice(index, index + URL_OPENER_LENGTH));
}

function percentSmaller(before: number, after: number): number {
  return Math.round((1 - after / before) * 100);
}

/** End offset (exclusive) of the block comment that starts at `start`; an unterminated one runs to the end. */
function findCommentEnd(css: string, start: number): number {
  const closerIndex = css.indexOf("*/", start + 2);
  return closerIndex === -1 ? css.length + 2 : closerIndex + 2;
}

/** End offset (exclusive) of the quoted string that starts at `start`, honouring backslash escapes. */
function findStringEnd(css: string, start: number): number {
  const quote = css[start];
  let index = start + 1;
  while (index < css.length) {
    if (css[index] === "\\") index += 2;
    else if (css[index] === quote) return index + 1;
    else index++;
  }
  return css.length;
}

/** Unquoted url(…) body: everything up to and including the closing parenthesis, verbatim. */
function findUnquotedUrlEnd(css: string, start: number): number {
  const closerIndex = css.indexOf(")", start);
  return closerIndex === -1 ? css.length : closerIndex + 1;
}

function readUrlOpener(css: string, start: number): CssToken {
  let end = start + URL_OPENER_LENGTH;
  while (end < css.length && isWhitespace(css[end])) end++;
  return { kind: "url-open", text: css.slice(start, start + URL_OPENER_LENGTH), start, end };
}

function readToken(css: string, start: number): CssToken {
  const character = css[start];
  if (character === "/" && css[start + 1] === "*") {
    return { kind: "comment", text: "", start, end: findCommentEnd(css, start) };
  }
  if (isQuote(character)) {
    const end = findStringEnd(css, start);
    return { kind: "string", text: css.slice(start, end), start, end };
  }
  if ((character === "u" || character === "U") && startsWithUrlOpener(css, start)) return readUrlOpener(css, start);
  const kind = isWhitespace(character) ? "whitespace" : "other";
  return { kind, text: css.slice(start, start + 1), start, end: start + 1 };
}

/** Splits CSS into comments, strings, url( openers + unquoted bodies, whitespace and single other characters. */
function tokenizeCss(css: string): CssToken[] {
  const tokens: CssToken[] = [];
  let index = 0;
  while (index < css.length) {
    const token = readToken(css, index);
    tokens.push(token);
    index = token.end;
    if (token.kind === "url-open" && !isQuote(css[index])) {
      const bodyEnd = findUnquotedUrlEnd(css, index);
      tokens.push({ kind: "url-body", text: css.slice(index, bodyEnd), start: index, end: bodyEnd });
      index = bodyEnd;
    }
  }
  return tokens;
}

function minifyCss(css: string): string {
  let output = "";
  let hasPendingSpace = false;
  for (const token of tokenizeCss(css)) {
    // Comments count as whitespace; any run of whitespace collapses to ONE space, never zero.
    if (token.kind === "comment" || token.kind === "whitespace") {
      hasPendingSpace = true;
      continue;
    }
    if (hasPendingSpace) output += " ";
    hasPendingSpace = false;
    output += token.text;
  }
  return `${output.trim()}\n`;
}

// The old "containment" probe check lived here: it compared formatted critical.css to the minified bundle by text, so it
// raised false positives (Tailwind's `.shell`, `:root`) and missed real drift (a rule that exists in both files with
// different declarations). `scripts/critical-parity-check.ts` replaces it by measuring the rendered layout instead.

const stylesSource = readFileSync(STYLES_SOURCE, "utf8");
const tailwindSource = existsSync(TAILWIND_SOURCE) ? readFileSync(TAILWIND_SOURCE, "utf8") : "";
const readIfPresent = (path: string): string => (existsSync(path) ? readFileSync(path, "utf8") : "");
// Generated by build-brand-css.ts: the `.bc-<hex>` brand tint classes (every pill) and the hero partner colours (critical).
const bundle = `${tailwindSource}\n${stylesSource}\n${readIfPresent(BRANDS_SOURCE)}`;
const stylesMinified = minifyCss(bundle);
writeFileSync(STYLES_OUTPUT, stylesMinified);
logDone(
  `minify-css: tailwind.css + styles.css ${bundle.length}B → styles.min.css ${stylesMinified.length}B (${percentSmaller(bundle.length, stylesMinified.length)}% smaller)`,
);

if (existsSync(CRITICAL_SOURCE)) {
  const criticalSource = readFileSync(CRITICAL_SOURCE, "utf8");
  // The whole compiled Tailwind output (reset + components + the utilities the markup uses) goes in first: it is only ~20 KB and
  // the markup is full of utility classes, so without it the first paint lays out with UA margins and default line-heights and the
  // page reflows when styles.min.css lands (CLS). Order matches the full bundle: tailwind, then critical.css overrides.
  const criticalMinified = minifyCss(`${tailwindSource}\n${criticalSource}\n${readIfPresent(BRANDS_CRITICAL_SOURCE)}`);
  writeFileSync(CRITICAL_OUTPUT, criticalMinified);
  logDone(
    `minify-css: critical.css ${criticalSource.length}B → critical.min.css ${criticalMinified.length}B (${percentSmaller(criticalSource.length, criticalMinified.length)}% smaller)`,
  );
} else {
  logWarn("minify-css — critical.css missing; skipped critical.min.css");
}
