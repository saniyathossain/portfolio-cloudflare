#!/usr/bin/env node
/** Sync <head> SEO, preloads, JSON-LD, and h1 fallbacks from portfolio.json */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const JSON_PATH = path.join(ROOT, "public/assets/data/portfolio.json");
const HTML_PATH = path.join(ROOT, "public/index.html");
const BOOT_PATH = path.join(ROOT, "public/assets/js/boot.js");
// Read the version set-asset-version.js already stamped into boot.js (build.sh runs that script
// first) rather than recomputing an independent hash here. Two independent computeHash() calls with
// their own exclusion sets previously diverged the moment boot.min.js's content changed between the
// two runs (minify-js.js bakes the new ASSET_V into it in between) — reading the single
// already-computed value instead makes divergence structurally impossible. Applied to favicon/icon
// links too: browsers cache favicons very aggressively per-origin and otherwise won't pick up a
// regenerated icon on refresh.
const bootSrc = fs.readFileSync(BOOT_PATH, "utf8");
const assetVMatch = bootSrc.match(/const ASSET_V = "([^"]+)";/);
if (!assetVMatch) throw new Error("sync-head: could not read ASSET_V from boot.js — run set-asset-version.js first");
const ASSET_V = assetVMatch[1];

function absUrl(siteUrl, p) {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  return String(siteUrl || "").replace(/\/$/, "") + p;
}

function webpFor(imagePath) {
  if (!imagePath) return "";
  return imagePath.replace(/\.(jpe?g|png)$/i, ".webp");
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

// Same "completed years" math as data.js's browser-side _yearsSince (duplicated, not shared — this
// runs in Node at build time, data.js runs in the browser, and this static-site setup has no shared
// module boundary between the two) — keeps the {years} placeholder in ogDescription in sync with
// profile.experienceStartDate/experienceYearsOffset instead of a hand-maintained number that only
// ever gets updated when someone remembers to.
function yearsSince(dateStr, offset) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return 0;
  const start = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const monthDiff = now.getMonth() - start.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < start.getDate())) years--;
  return Math.max(0, years - (parseInt(offset, 10) || 0));
}

function fillTemplate(str, vars) {
  return String(str || "").replace(/\{(\w+)\}/g, (_, key) => (key in vars ? vars[key] : `{${key}}`));
}

// Opt-in analytics — emitted only when an id/token is set in portfolio.json (site.analytics).
// Empty by default → nothing injected → zero external requests. Ids are sanitised to [\w-] so the
// value can't break out of the tag. CSP hosts for these are allow-listed in src/index.js.
function buildAnalytics(site) {
  const a = (site && site.analytics) || {};
  const gid = String(a.googleId || "").replace(/[^\w-]/g, "");
  const cf = String(a.cloudflareToken || "").replace(/[^\w-]/g, "");
  let out = "";
  if (gid) {
    out +=
      `\n  <script async src="https://www.googletagmanager.com/gtag/js?id=${gid}"></script>` +
      `\n  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gid}');</script>`;
  }
  if (cf) {
    out += `\n  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${cf}"}'></script>`;
  }
  return out;
}

function stylesheetLinks() {
  const criticalPath = path.join(ROOT, "public/assets/css/critical.min.css");
  const stylesHref = `/assets/css/styles.min.css?v=${ASSET_V}`;
  if (!fs.existsSync(criticalPath)) {
    console.warn("WARNING: sync-head — critical.min.css missing; falling back to blocking stylesheet");
    return `  <link rel="stylesheet" href="${stylesHref}">`;
  }
  // Minified critical CSS only — source is our own build output (no </style> risk when clean).
  const criticalMinCss = fs.readFileSync(criticalPath, "utf8").trim();
  return `  <style>${criticalMinCss}</style>
  <link rel="preload" href="${stylesHref}" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="${stylesHref}"></noscript>`;
}

function buildHead(data) {
  const { site, profile, socials } = data;
  const years = yearsSince(profile.experienceStartDate, profile.experienceYearsOffset);
  const ogDescription = fillTemplate(site.ogDescription, { years });
  const ogImage = absUrl(site.url, site.ogImage || "/assets/img/saniyat-hossain.jpg");
  const heroWebp480 = path.join(ROOT, "public/assets/img/saniyat-hossain-480.webp");
  const heroWebpLink = fs.existsSync(heroWebp480)
    ? '  <link rel="preload" href="/assets/img/saniyat-hossain-480.webp" as="image" type="image/webp" fetchpriority="high" imagesrcset="/assets/img/saniyat-hossain-480.webp 480w, /assets/img/saniyat-hossain-900.webp 900w, /assets/img/saniyat-hossain-1300.webp 1300w, /assets/img/saniyat-hossain-1800.webp 1800w" imagesizes="(min-width: 1024px) 62vw, 100vw">\n'
    : "";
  const ld = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    alternateName: `${profile.shortName} Hossain`,
    jobTitle: profile.title,
    url: site.url,
    image: absUrl(site.url, profile.avatar),
    email: `mailto:${profile.email}`,
    sameAs: (socials || []).map((s) => s.href),
  };

  return `  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(site.title)}</title>
  <meta name="description" content="${esc(site.description)}">
  <meta name="theme-color" content="${esc(site.themeColor || "#0a0a0a")}">
  <meta name="author" content="${esc(profile.name)}">
  <meta name="keywords" content="${esc(site.keywords)}">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="canonical" href="${esc(absUrl(site.url, "/"))}">
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg?v=${ASSET_V}">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png?v=${ASSET_V}">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png?v=${ASSET_V}">
  <link rel="manifest" href="/assets/data/manifest.webmanifest">
${heroWebpLink}  <meta property="og:type" content="website">
  <meta property="og:url" content="${esc(absUrl(site.url, "/"))}">
  <meta property="og:title" content="${esc(site.title)}">
  <meta property="og:description" content="${esc(ogDescription || site.description)}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(site.title)}">
  <meta name="twitter:description" content="${esc(site.twitterDescription || site.description)}">
  <meta name="twitter:image" content="${esc(ogImage)}">
  <script type="application/ld+json" id="ld-person">${JSON.stringify(ld)}</script>
${stylesheetLinks()}${buildAnalytics(site)}`;
}


function buildHeroEyebrow(profile) {
  return esc(`${profile.title} · ${profile.location}`);
}

function buildHeroRating(profile) {
  const years = yearsSince(profile.experienceStartDate, profile.experienceYearsOffset);
  const tail = profile.heroRatingTail || "";
  // Matches data.js: profile.years = years+"+" ; heroRating = years+" years · "+tail
  return esc(`${years}+ years · ${tail}`);
}

function buildHeroWm(profile) {
  return esc(String(profile.shortName || "Saniyat").toUpperCase());
}

function buildH1(profile) {
  const lines = profile.nameLines || ["Mohammad", "Saniyat", "Hossain"];
  return lines
    .map((line, i) => {
      const grad = i === lines.length - 1 ? " accent grad" : "";
      // Static text only — no Alpine x-text. Replacing identical text at Alpine boot
      // re-triggers LCP at ~3–4s under mobile throttle (AC1). sync-head keeps these in sync with JSON.
      return `              <span class="line-wrap">
                <span class="line-inner${grad}">${esc(line)}</span>
              </span>`;
    })
    .join("\n");
}

function replaceBlock(html, start, end, content) {
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a === -1 || b === -1) throw new Error(`Missing markers: ${start}`);
  return `${html.slice(0, a + start.length)}\n${content}\n  ${html.slice(b)}`;
}

const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
let html = fs.readFileSync(HTML_PATH, "utf8");
html = replaceBlock(html, "<!-- SYNC:HEAD:START -->", "<!-- SYNC:HEAD:END -->", buildHead(data));
html = replaceBlock(html, "<!-- SYNC:H1:START -->", "<!-- SYNC:H1:END -->", buildH1(data.profile));
html = replaceBlock(html, "<!-- SYNC:HERO-EYEBROW:START -->", "<!-- SYNC:HERO-EYEBROW:END -->", buildHeroEyebrow(data.profile));
html = replaceBlock(html, "<!-- SYNC:HERO-RATING:START -->", "<!-- SYNC:HERO-RATING:END -->", buildHeroRating(data.profile));
html = replaceBlock(html, "<!-- SYNC:HERO-WM:START -->", "<!-- SYNC:HERO-WM:END -->", buildHeroWm(data.profile));
// Boot-loaded body scripts (data/icons/loader/boot .min.js) and the bismillah SVG carry the
// same ?v= as the head links.
html = html.replace(
  /(\/assets\/js\/(?:data|icons|loader|boot)\.min\.js|\/assets\/img\/bismillah\.svg)\?v=[^"]+/g,
  (_, src) => `${src}?v=${ASSET_V}`
);
fs.writeFileSync(HTML_PATH, html);
console.log("Synced head + h1 from portfolio.json — asset version:", ASSET_V);
