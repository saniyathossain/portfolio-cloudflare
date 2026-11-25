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
const CRITICAL_SOURCE = join(CSS_DIR, "critical.css");
const CRITICAL_OUTPUT = join(CSS_DIR, "critical.min.css");

const MIN_BLOCK_BODY_LENGTH = 24;
const MIN_PROBE_LENGTH = 16;
const MAX_PROBE_LENGTH = 80;
const PROBE_WINDOW_LENGTH = 48;
const LABEL_MAX_LENGTH = 60;
const PROBE_PREVIEW_LENGTH = 40;
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

function stripComments(css: string): string {
  return tokenizeCss(css)
    .map((token) => (token.kind === "comment" ? "" : token.text))
    .join("");
}

interface RuleBlock {
  selector: string;
  body: string;
}

/** Top-level `selector { body }` blocks with a substantial body. */
function extractSubstantialBlocks(criticalCss: string): RuleBlock[] {
  const blocks: RuleBlock[] = [];
  let depth = 0;
  let blockStart = 0;
  for (const token of tokenizeCss(criticalCss)) {
    if (token.kind !== "other") continue;
    if (token.text === "{") {
      if (depth === 0) blockStart = token.start;
      depth++;
      continue;
    }
    if (token.text !== "}") continue;
    depth--;
    if (depth !== 0) continue;
    const block = readBlock(criticalCss, blockStart, token.start);
    if (block.body.length >= MIN_BLOCK_BODY_LENGTH) blocks.push(block);
  }
  return blocks;
}

function readBlock(criticalCss: string, openIndex: number, closeIndex: number): RuleBlock {
  let selectorStart = openIndex;
  while (selectorStart > 0 && criticalCss[selectorStart - 1] !== "}") selectorStart--;
  return {
    selector: criticalCss.slice(selectorStart, openIndex).trim().replace(/\s+/g, " "),
    body: criticalCss.slice(openIndex + 1, closeIndex).trim(),
  };
}

/** A short distinctive slice of a rule body, used to look the rule up in styles.css. */
function buildProbe(body: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= MAX_PROBE_LENGTH) return compact;
  const windowStart = Math.floor((compact.length - PROBE_WINDOW_LENGTH) / 2);
  return compact.slice(windowStart, windowStart + PROBE_WINDOW_LENGTH);
}

/** Warn if distinctive body text from substantial critical rule blocks is missing in styles.css. */
function checkContainment(criticalSource: string, stylesSource: string): void {
  const blocks = extractSubstantialBlocks(stripComments(criticalSource));
  // Collapse WS on both sides so probes survive formatting differences between extract + source.
  const normalizedStyles = stylesSource.replace(/\s+/g, " ");

  let warningCount = 0;
  for (const { selector, body } of blocks) {
    const probe = buildProbe(body);
    if (probe.length < MIN_PROBE_LENGTH) continue;
    if (!normalizedStyles.includes(probe)) {
      warningCount++;
      const label = (selector.split(/\s*,\s*/)[0] ?? "").slice(0, LABEL_MAX_LENGTH);
      const preview = probe.slice(0, PROBE_PREVIEW_LENGTH) + (probe.length > PROBE_PREVIEW_LENGTH ? "…" : "");
      logWarn(`minify-css containment — critical rule not found in styles.css: ${label} … probe=${JSON.stringify(preview)}`);
    }
  }
  if (warningCount === 0) {
    logDone(`minify-css: critical containment OK (${blocks.length} substantial blocks checked)`);
  } else {
    logWarn(`minify-css: critical containment — ${warningCount} WARNING(s)`);
  }
}

const stylesSource = readFileSync(STYLES_SOURCE, "utf8");
const tailwindSource = existsSync(TAILWIND_SOURCE) ? readFileSync(TAILWIND_SOURCE, "utf8") : "";
const bundle = `${tailwindSource}\n${stylesSource}`;
const stylesMinified = minifyCss(bundle);
writeFileSync(STYLES_OUTPUT, stylesMinified);
logDone(
  `minify-css: tailwind.css + styles.css ${bundle.length}B → styles.min.css ${stylesMinified.length}B (${percentSmaller(bundle.length, stylesMinified.length)}% smaller)`,
);

if (existsSync(CRITICAL_SOURCE)) {
  const criticalSource = readFileSync(CRITICAL_SOURCE, "utf8");
  checkContainment(criticalSource, stylesSource);
  const criticalMinified = minifyCss(criticalSource);
  writeFileSync(CRITICAL_OUTPUT, criticalMinified);
  logDone(
    `minify-css: critical.css ${criticalSource.length}B → critical.min.css ${criticalMinified.length}B (${percentSmaller(criticalSource.length, criticalMinified.length)}% smaller)`,
  );
} else {
  logWarn("minify-css — critical.css missing; skipped critical.min.css");
}
