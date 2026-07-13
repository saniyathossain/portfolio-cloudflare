#!/usr/bin/env node
/**
 * Build-time article fetch — pulls the user's real posts from dev.to + Medium and merges them into
 * portfolio.json's "articles" array. Network happens ONLY here, at build time; the deployed site
 * reads the resulting static JSON with zero runtime requests (see doc 46, Track A).
 *
 * Idempotent merge: matches existing entries by `id`, preserves the user's hand-set `active` flag
 * and any hand-edited fields on re-run, and appends newly discovered posts with `active: false`
 * (opt-in curation — nothing shows up unannounced). Never fabricates content; on fetch failure the
 * existing JSON is left untouched and a warning is printed (a missing network must not break the
 * build).
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const JSON_PATH = path.join(ROOT, "public/assets/data/portfolio.json");
const DEVTO_USERNAME = "saniyathossain";
const MEDIUM_USERNAME = "saniyathossain";

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "portfolio-build-script" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`${url} → ${res.statusCode}`));
          res.resume();
          return;
        }
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve(body));
      })
      .on("error", reject)
      .setTimeout(10000, function () {
        this.destroy(new Error(`timeout: ${url}`));
      });
  });
}

async function fetchDevTo() {
  const body = await get(`https://dev.to/api/articles?username=${DEVTO_USERNAME}`);
  const list = JSON.parse(body);
  return list.map((a) => ({
    id: `devto:${a.id}`,
    platform: "dev.to",
    title: a.title,
    href: a.url,
    date: (a.published_at || "").slice(0, 10),
    readMin: a.reading_time_minutes || null,
    excerpt: a.description || "",
    tags: Array.isArray(a.tag_list) ? a.tag_list.slice(0, 4) : [],
  }));
}

// Medium's RSS is XML — hand-rolled minimal parse (no DOM/XML parser dependency in this
// no-build-step project). Only the fields we need: title, link, pubDate, description, categories.
function parseMediumRss(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const pick = (tag) => {
      const re = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`);
      const mm = block.match(re);
      return mm ? mm[1].trim() : "";
    };
    const title = pick("title");
    const link = pick("link").split("?")[0];
    const pubDate = pick("pubDate");
    const description = pick("description")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
    const categories = Array.from(block.matchAll(/<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g)).map(
      (c) => c[1].trim()
    );
    if (!title || !link) continue;
    const date = pubDate ? new Date(pubDate).toISOString().slice(0, 10) : "";
    items.push({
      id: `medium:${link}`,
      platform: "Medium",
      title,
      href: link,
      date,
      readMin: null,
      excerpt: description,
      tags: categories.slice(0, 4),
    });
  }
  return items;
}

async function fetchMedium() {
  const xml = await get(`https://${MEDIUM_USERNAME}.medium.com/feed`);
  return parseMediumRss(xml);
}

// Preserve `active` + any hand edits on existing entries; append new ones as active:false (opt-in).
function mergeArticles(existing, fetched) {
  const byId = new Map(existing.map((a) => [a.id, a]));
  const merged = [];
  for (const f of fetched) {
    const prev = byId.get(f.id);
    if (prev) {
      merged.push(Object.assign({}, f, { active: !!prev.active }));
      byId.delete(f.id);
    } else {
      merged.push(Object.assign({}, f, { active: false }));
    }
  }
  // Keep any existing entries the fetch no longer returns (e.g. a platform hiccup) instead of
  // silently dropping curated/active posts.
  for (const leftover of byId.values()) merged.push(leftover);
  return merged;
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const existing = Array.isArray(raw.articles) ? raw.articles : [];

  let fetched = [];
  const results = await Promise.allSettled([fetchDevTo(), fetchMedium()]);
  for (const r of results) {
    if (r.status === "fulfilled") fetched = fetched.concat(r.value);
    else console.warn("fetch-articles: WARNING —", r.reason.message);
  }

  if (!fetched.length) {
    console.warn("fetch-articles: no posts fetched (offline or both sources failed) — leaving portfolio.json untouched.");
    return;
  }

  raw.articles = mergeArticles(existing, fetched);
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(raw, null, 2)}\n`);
  const newCount = raw.articles.filter((a) => !existing.some((e) => e.id === a.id)).length;
  console.log(
    `fetch-articles: merged ${fetched.length} posts (${newCount} new, added as inactive — curate via \`active\` in portfolio.json).`
  );
}

main().catch((err) => {
  console.warn("fetch-articles: WARNING — build continues without updated articles:", err.message);
});
