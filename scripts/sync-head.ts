#!/usr/bin/env node
/** Sync <head> SEO, preloads, JSON-LD, and h1 fallbacks from portfolio.json */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyBuildEnvironment, readSampleRate } from "../src/lib/buildSettings.ts";
import type { Portfolio, Profile, Site } from "../src/types/Portfolio.ts";
import { logDone, logWarn } from "./lib/console.ts";

const ROOT = join(import.meta.dirname, "..");
const JSON_PATH = join(ROOT, "public/assets/data/portfolio.json");
const HTML_PATH = join(ROOT, "src/legacy/index.html");
const BOOT_PATH = join(ROOT, "src/client/boot.ts");
const CRITICAL_CSS_PATH = join(ROOT, "public/assets/css/critical.min.css");
const HERO_WEBP_480_PATH = join(ROOT, "public/assets/img/saniyat-hossain-480.webp");

const DEFAULT_THEME_COLOR = "#0a0a0a";
const DEFAULT_OG_IMAGE_PATH = "/assets/img/saniyat-hossain.jpg";
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const CSS_PENDING_FAILSAFE_MS = 6000;
const HERO_WEBP_PRELOAD =
  '  <link rel="preload" href="/assets/img/saniyat-hossain-480.webp" as="image" type="image/webp" fetchpriority="high" imagesrcset="/assets/img/saniyat-hossain-480.webp 480w, /assets/img/saniyat-hossain-760.webp 760w, /assets/img/saniyat-hossain-840.webp 840w, /assets/img/saniyat-hossain-900.webp 900w, /assets/img/saniyat-hossain-1300.webp 1300w, /assets/img/saniyat-hossain-1800.webp 1800w" imagesizes="(min-width: 1024px) 62vw, 100vw">\n';

// Read the version set-asset-version.ts already stamped into boot.ts (build.sh runs that script
// first) rather than recomputing an independent hash here. Two independent computeHash() calls with
// their own exclusion sets previously diverged the moment boot.min.js's content changed between the
// two runs — reading the single already-computed value instead makes divergence structurally
// impossible. Applied to favicon/icon links too: browsers cache favicons very aggressively
// per-origin and otherwise won't pick up a regenerated icon on refresh.
const bootSource = readFileSync(BOOT_PATH, "utf8");
const assetVersionMatch = /const ASSET_V = "([^"]+)";/.exec(bootSource);
if (!assetVersionMatch?.[1]) {
  throw new Error("sync-head: could not read ASSET_V from src/client/boot.ts — run set-asset-version.ts first");
}
const ASSET_V = assetVersionMatch[1];

function toAbsoluteUrl(siteUrl: string, path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return (siteUrl || "").replace(/\/$/, "") + path;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// Same "completed years" math as data.ts's browser-side yearsSince (duplicated, not shared — this
// runs in Node at build time, the browser bundle has no shared module boundary with it) — keeps the
// {years} placeholder in ogDescription in sync with profile.experienceStartDate/experienceYearsOffset
// instead of a hand-maintained number that only ever gets updated when someone remembers to.
function yearsSince(dateText: string, offset: number): number {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText || "");
  if (!dateParts) return 0;
  const start = new Date(parseInt(dateParts[1] ?? "", 10), parseInt(dateParts[2] ?? "", 10) - 1, parseInt(dateParts[3] ?? "", 10));
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const monthDifference = now.getMonth() - start.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < start.getDate())) years--;
  return Math.max(0, years - (offset || 0));
}

function fillTemplate(template: string, variables: Readonly<Record<string, number>>): string {
  return (template || "").replace(/\{(\w+)\}/g, (_placeholder, key: string) =>
    key in variables ? String(variables[key]) : `{${key}}`,
  );
}

// Opt-in analytics — emitted only when an id/token is set (GOOGLE_ANALYTICS_ID / CLOUDFLARE_ANALYTICS_TOKEN build variables,
// else portfolio.json site.analytics).
// Empty by default → nothing injected → zero external requests. Ids are sanitised to [\w-] so the
// value can't break out of the tag. CSP hosts for these are allow-listed in src/worker/security/headers.ts.
function buildAnalytics(jsonSite: Site): string {
  const site = applyBuildEnvironment(jsonSite, process.env);
  const googleId = site.analytics.googleId.replace(/[^\w-]/g, "");
  const cloudflareToken = site.analytics.cloudflareToken.replace(/[^\w-]/g, "");
  let markup = "";
  if (googleId) {
    markup +=
      `\n  <script async src="https://www.googletagmanager.com/gtag/js?id=${googleId}"></script>` +
      `\n  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${googleId}');</script>`;
  }
  if (cloudflareToken) {
    markup += `\n  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${cloudflareToken}"}'></script>`;
  }
  return markup;
}

// Opt-in real-user Web Vitals (docs/aidlc/69): a meta tag carries the endpoint and sampling rate to boot.ts. Emitted only when
// RUM_SAMPLE_RATE > 0, so the default build adds no script, no meta and no request.
const RUM_ENDPOINT = "/api/vitals";

function buildRumMeta(): string {
  const sample = readSampleRate(process.env);
  if (sample === 0) return "";
  const content = JSON.stringify({ endpoint: RUM_ENDPOINT, sample }).replace(/"/g, "&quot;");
  return `\n  <meta name="portfolio-rum" content="${content}">`;
}

function buildStylesheetLinks(): string {
  const stylesHref = `/assets/css/styles.min.css?v=${ASSET_V}`;
  if (!existsSync(CRITICAL_CSS_PATH)) {
    logWarn("sync-head — critical.min.css missing; falling back to blocking stylesheet");
    return `  <link rel="stylesheet" href="${stylesHref}">`;
  }
  // Minified critical CSS only — source is our own build output (no </style> risk when clean).
  const criticalMinCss = readFileSync(CRITICAL_CSS_PATH, "utf8").trim();
  // `css-pending` marks the window before styles.min.css is applied. Server-rendered sections are hidden by
  // critical.css during it, so a first (uncached) visit never flashes unstyled markup — oversized SVG icons,
  // default-blue links. It is cleared on load, on error, and after a 6 s failsafe so content can never stay hidden.
  // Without JS the class is never added, so the markup shows (the <noscript> stylesheet is render-blocking).
  // One inline script (allowed by hash in the CSP, docs/aidlc/73) instead of onload/onerror attributes, which would need
  // 'unsafe-hashes'. If the preload finished before the listeners attached (cached), the resource timing entry tells us.
  return `  <style>${criticalMinCss}</style>
  <link rel="preload" href="${stylesHref}" as="style">
  <script>(function(){var r=document.documentElement,l=document.currentScript.previousElementSibling;r.classList.add("css-pending");function d(){r.classList.remove("css-pending")}function s(){l.rel="stylesheet";d()}setTimeout(d,${CSS_PENDING_FAILSAFE_MS});l.addEventListener("load",s);l.addEventListener("error",d);var e=performance.getEntriesByName(l.href)[0];if(e&&e.responseEnd>0)s()})()</script>
  <noscript><link rel="stylesheet" href="${stylesHref}"></noscript>`;
}

function buildHead(data: Portfolio): string {
  const { site, profile, socials } = data;
  const years = yearsSince(profile.experienceStartDate, profile.experienceYearsOffset);
  const ogDescription = fillTemplate(site.ogDescription, { years });
  const ogImage = toAbsoluteUrl(site.url, site.ogImage || DEFAULT_OG_IMAGE_PATH);
  const heroWebpLink = existsSync(HERO_WEBP_480_PATH) ? HERO_WEBP_PRELOAD : "";
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    alternateName: `${profile.shortName} Hossain`,
    jobTitle: profile.title,
    url: site.url,
    image: toAbsoluteUrl(site.url, profile.avatar),
    email: `mailto:${profile.email}`,
    sameAs: socials.map((social) => social.href),
  };

  return `  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(site.title)}</title>
  <meta name="description" content="${escapeHtml(site.description)}">
  <meta name="theme-color" content="${escapeHtml(site.themeColor || DEFAULT_THEME_COLOR)}">
  <meta name="author" content="${escapeHtml(profile.name)}">
  <meta name="keywords" content="${escapeHtml(site.keywords)}">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="canonical" href="${escapeHtml(toAbsoluteUrl(site.url, "/"))}">
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg?v=${ASSET_V}">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png?v=${ASSET_V}">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png?v=${ASSET_V}">
  <link rel="manifest" href="/assets/data/manifest.webmanifest">
${heroWebpLink}  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(toAbsoluteUrl(site.url, "/"))}">
  <meta property="og:title" content="${escapeHtml(site.title)}">
  <meta property="og:description" content="${escapeHtml(ogDescription || site.description)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:width" content="${OG_IMAGE_WIDTH}">
  <meta property="og:image:height" content="${OG_IMAGE_HEIGHT}">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(site.title)}">
  <meta name="twitter:description" content="${escapeHtml(site.twitterDescription || site.description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <script type="application/ld+json" id="ld-person">${JSON.stringify(personJsonLd)}</script>
${buildStylesheetLinks()}${buildAnalytics(site)}${buildRumMeta()}`;
}

function buildHeroEyebrow(profile: Profile): string {
  return escapeHtml(`${profile.title} · ${profile.location}`);
}

function buildHeroRating(profile: Profile): string {
  // Matches data.ts: heroRating = heroRatingTail (no years-of-experience prefix).
  return escapeHtml(profile.heroRatingTail);
}

function buildHeroWatermark(profile: Profile): string {
  return escapeHtml(profile.shortName.toUpperCase());
}

function buildH1(profile: Profile): string {
  const { nameLines } = profile;
  return nameLines
    .map((line, lineIndex) => {
      const gradientClasses = lineIndex === nameLines.length - 1 ? " accent grad" : "";
      // Static text only — no runtime text binding. Replacing identical text at boot
      // re-triggers LCP at ~3–4s under mobile throttle (AC1). sync-head keeps these in sync with JSON.
      return `              <span class="line-wrap">
                <span class="line-inner${gradientClasses}">${escapeHtml(line)}</span>
              </span>`;
    })
    .join("\n");
}

function replaceBlock(html: string, startMarker: string, endMarker: string, content: string): string {
  const startIndex = html.indexOf(startMarker);
  const endIndex = html.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1) throw new Error(`Missing markers: ${startMarker}`);
  return `${html.slice(0, startIndex + startMarker.length)}\n${content}\n  ${html.slice(endIndex)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The JSON is schema-validated by the Astro build and the unit tests; here we only guard the top-level shape. */
function readPortfolio(): Portfolio {
  const parsed: unknown = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  if (!isRecord(parsed) || !isRecord(parsed["site"]) || !isRecord(parsed["profile"])) {
    throw new Error("sync-head: portfolio.json is missing its `site` / `profile` sections");
  }
  return parsed as Portfolio;
}

const data = readPortfolio();
let html = readFileSync(HTML_PATH, "utf8");
html = replaceBlock(html, "<!-- SYNC:HEAD:START -->", "<!-- SYNC:HEAD:END -->", buildHead(data));
html = replaceBlock(html, "<!-- SYNC:H1:START -->", "<!-- SYNC:H1:END -->", buildH1(data.profile));
html = replaceBlock(html, "<!-- SYNC:HERO-EYEBROW:START -->", "<!-- SYNC:HERO-EYEBROW:END -->", buildHeroEyebrow(data.profile));
html = replaceBlock(html, "<!-- SYNC:HERO-RATING:START -->", "<!-- SYNC:HERO-RATING:END -->", buildHeroRating(data.profile));
html = replaceBlock(html, "<!-- SYNC:HERO-WM:START -->", "<!-- SYNC:HERO-WM:END -->", buildHeroWatermark(data.profile));
// Boot-loaded body scripts (data/icons/loader/boot .min.js) and the bismillah SVG carry the
// same ?v= as the head links.
html = html.replace(
  /(\/assets\/js\/(?:data|icons|loader|boot)\.min\.js|\/assets\/img\/bismillah\.svg)\?v=[^"]+/g,
  (_match, source: string) => `${source}?v=${ASSET_V}`,
);
writeFileSync(HTML_PATH, html);
logDone(`Synced head + h1 from portfolio.json — asset version: ${ASSET_V}`);
