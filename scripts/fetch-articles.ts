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
import { readFileSync, writeFileSync } from "node:fs";
import { get as httpsGet } from "node:https";
import { join } from "node:path";
import type { Article } from "../src/types/Portfolio.ts";
import { logDone, logWarn } from "./lib/console.ts";

const ROOT = join(import.meta.dirname, "..");
const JSON_PATH = join(ROOT, "public/assets/data/portfolio.json");
const DEVTO_USERNAME = "saniyathossain";
const MEDIUM_USERNAME = "saniyathossain";
const USER_AGENT = "portfolio-build-script";
const REQUEST_TIMEOUT_MS = 10_000;
const HTTP_OK = 200;
const HTTP_REDIRECT_MIN = 300;
const HTTP_REDIRECT_MAX = 400;
const MAX_TAGS = 4;
const MAX_EXCERPT_LENGTH = 220;
const ISO_DATE_LENGTH = 10;
const JSON_INDENT = 2;

/** An article as fetched — `active` is decided by the merge, never by the source platform. */
type FetchedArticle = Omit<Article, "active">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function get(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    httpsGet(url, { headers: { "User-Agent": USER_AGENT } }, (response) => {
      const statusCode = response.statusCode ?? 0;
      const redirectLocation = response.headers.location;
      if (statusCode >= HTTP_REDIRECT_MIN && statusCode < HTTP_REDIRECT_MAX && redirectLocation) {
        get(redirectLocation).then(resolve, reject);
        return;
      }
      if (statusCode !== HTTP_OK) {
        reject(new Error(`${url} → ${statusCode}`));
        response.resume();
        return;
      }
      let body = "";
      response.on("data", (chunk: Buffer) => {
        body += chunk.toString("utf8");
      });
      response.on("end", () => {
        resolve(body);
      });
    })
      .on("error", reject)
      .setTimeout(REQUEST_TIMEOUT_MS, function onTimeout(this: { destroy(error: Error): void }) {
        this.destroy(new Error(`timeout: ${url}`));
      });
  });
}

function toDevToArticle(entry: unknown): FetchedArticle {
  const record = isRecord(entry) ? entry : {};
  const tagList = record["tag_list"];
  const readingMinutes = record["reading_time_minutes"];
  return {
    id: `devto:${String(record["id"])}`,
    platform: "dev.to",
    title: asText(record["title"]),
    href: asText(record["url"]),
    date: asText(record["published_at"]).slice(0, ISO_DATE_LENGTH),
    readMin: typeof readingMinutes === "number" && readingMinutes ? readingMinutes : null,
    excerpt: asText(record["description"]),
    tags: Array.isArray(tagList) ? tagList.filter((tag): tag is string => typeof tag === "string").slice(0, MAX_TAGS) : [],
  };
}

async function fetchDevTo(): Promise<FetchedArticle[]> {
  const body = await get(`https://dev.to/api/articles?username=${DEVTO_USERNAME}`);
  const list: unknown = JSON.parse(body);
  if (!Array.isArray(list)) throw new Error("dev.to returned a non-array payload");
  return list.map(toDevToArticle);
}

/** Text of the first `<tag>` element in an RSS item block, CDATA unwrapped ("" when absent). */
function pickRssField(block: string, tag: string): string {
  const fieldPattern = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`);
  return block.match(fieldPattern)?.[1]?.trim() ?? "";
}

// Medium's RSS is XML — hand-rolled minimal parse (no DOM/XML parser dependency in this
// no-build-step project). Only the fields we need: title, link, pubDate, description, categories.
function parseMediumRss(xml: string): FetchedArticle[] {
  const items: FetchedArticle[] = [];
  for (const itemMatch of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = itemMatch[1] ?? "";
    const title = pickRssField(block, "title");
    const link = pickRssField(block, "link").split("?")[0] ?? "";
    const publishedText = pickRssField(block, "pubDate");
    const description = pickRssField(block, "description")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_EXCERPT_LENGTH);
    const categories = Array.from(
      block.matchAll(/<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g),
      (categoryMatch) => (categoryMatch[1] ?? "").trim(),
    );
    if (!title || !link) continue;
    const date = publishedText ? new Date(publishedText).toISOString().slice(0, ISO_DATE_LENGTH) : "";
    items.push({
      id: `medium:${link}`,
      platform: "Medium",
      title,
      href: link,
      date,
      readMin: null,
      excerpt: description,
      tags: categories.slice(0, MAX_TAGS),
    });
  }
  return items;
}

async function fetchMedium(): Promise<FetchedArticle[]> {
  const xml = await get(`https://${MEDIUM_USERNAME}.medium.com/feed`);
  return parseMediumRss(xml);
}

// Preserve `active` + any hand edits on existing entries; append new ones as active:false (opt-in).
function mergeArticles(existing: readonly Article[], fetched: readonly FetchedArticle[]): Article[] {
  const existingById = new Map(existing.map((article) => [article.id, article]));
  const merged: Article[] = [];
  for (const fetchedArticle of fetched) {
    const previous = existingById.get(fetchedArticle.id);
    merged.push({ ...fetchedArticle, active: previous ? previous.active : false });
    existingById.delete(fetchedArticle.id);
  }
  // Keep any existing entries the fetch no longer returns (e.g. a platform hiccup) instead of
  // silently dropping curated/active posts.
  for (const leftover of existingById.values()) merged.push(leftover);
  return merged;
}

async function main(): Promise<void> {
  const portfolio: unknown = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  if (!isRecord(portfolio)) throw new Error("portfolio.json is not an object");
  const existingValue = portfolio["articles"];
  // The document is schema-validated elsewhere; this script only reads `id`/`active` and rewrites the list.
  const existing = Array.isArray(existingValue) ? (existingValue as Article[]) : [];

  const fetched: FetchedArticle[] = [];
  const results = await Promise.allSettled([fetchDevTo(), fetchMedium()]);
  for (const result of results) {
    if (result.status === "fulfilled") fetched.push(...result.value);
    else logWarn(`fetch-articles: ${describeError(result.reason)}`);
  }

  if (!fetched.length) {
    logWarn("fetch-articles: no posts fetched (offline or both sources failed) — leaving portfolio.json untouched.");
    return;
  }

  const merged = mergeArticles(existing, fetched);
  portfolio["articles"] = merged;
  writeFileSync(JSON_PATH, `${JSON.stringify(portfolio, null, JSON_INDENT)}\n`);
  const newCount = merged.filter((article) => !existing.some((previous) => previous.id === article.id)).length;
  logDone(
    `fetch-articles: merged ${fetched.length} posts (${newCount} new, added as inactive — curate via \`active\` in portfolio.json).`,
  );
}

main().catch((error: unknown) => {
  logWarn(`fetch-articles: build continues without updated articles: ${describeError(error)}`);
});
