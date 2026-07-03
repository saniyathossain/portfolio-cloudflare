#!/usr/bin/env node
/** Sync <head> SEO, preloads, JSON-LD, and h1 fallbacks from portfolio.json */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const JSON_PATH = path.join(ROOT, "public/assets/data/portfolio.json");
const HTML_PATH = path.join(ROOT, "public/index.html");

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

function buildHead(data) {
  const { site, profile, socials } = data;
  const ogImage = absUrl(site.url, site.ogImage || "/assets/img/og-image.jpg");
  const heroWebp = path.join(ROOT, "public/assets/img/saniyat-hossain.webp");
  const heroWebpLink = fs.existsSync(heroWebp)
    ? '  <link rel="preload" href="/assets/img/saniyat-hossain.webp" as="image" type="image/webp" fetchpriority="high">\n'
    : "";
  const ld = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    alternateName: profile.shortName + " Hossain",
    jobTitle: profile.title,
    url: site.url,
    image: absUrl(site.url, profile.avatar),
    email: "mailto:" + profile.email,
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
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="manifest" href="/assets/data/manifest.webmanifest">
${heroWebpLink}  <meta property="og:type" content="website">
  <meta property="og:url" content="${esc(absUrl(site.url, "/"))}">
  <meta property="og:title" content="${esc(site.title)}">
  <meta property="og:description" content="${esc(site.ogDescription || site.description)}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(site.title)}">
  <meta name="twitter:description" content="${esc(site.twitterDescription || site.description)}">
  <meta name="twitter:image" content="${esc(ogImage)}">
  <script type="application/ld+json" id="ld-person">${JSON.stringify(ld)}</script>
  <link rel="stylesheet" href="/assets/css/tailwind.css">
  <link rel="stylesheet" href="/assets/css/styles.min.css?v=uplift-2">`;
}

function buildH1(profile) {
  const lines = profile.nameLines || ["Mohammad", "Saniyat", "Hossain"];
  return lines
    .map((line, i) => {
      const grad = i === lines.length - 1 ? " accent grad" : "";
      return `              <span class="line-wrap">
                <span class="line-inner${grad}" x-text="profile.nameLines[${i}]">${esc(line)}</span>
              </span>`;
    })
    .join("\n");
}

function replaceBlock(html, start, end, content) {
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a === -1 || b === -1) throw new Error("Missing markers: " + start);
  return html.slice(0, a + start.length) + "\n" + content + "\n  " + html.slice(b);
}

const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
let html = fs.readFileSync(HTML_PATH, "utf8");
html = replaceBlock(html, "<!-- SYNC:HEAD:START -->", "<!-- SYNC:HEAD:END -->", buildHead(data));
html = replaceBlock(html, "<!-- SYNC:H1:START -->", "<!-- SYNC:H1:END -->", buildH1(data.profile));
fs.writeFileSync(HTML_PATH, html);
console.log("Synced head + h1 from portfolio.json");
