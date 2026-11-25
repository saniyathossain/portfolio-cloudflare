import { describe, expect, it } from "vitest";
import {
  activeArticles,
  articleDateLabel,
  articleExcerpt,
  articleMatchesTab,
  buildPlatformTabs,
  easeOutCubicOvershoot,
  filterArticles,
  filterByPlatform,
  matchesSearch,
  pickLensIndex,
  platformIconName,
  rowTint,
  type EditorialTabConfig,
} from "../../src/lib/editorial";
import { EditorialMatchMode } from "../../src/enums/EditorialMatchMode";
import type { Article } from "../../src/types/Portfolio";

const allTab: EditorialTabConfig = {
  key: "all",
  label: "All",
  icon: null,
  ci: "blue",
  match: { mode: EditorialMatchMode.All, value: "" },
};
const devTab: EditorialTabConfig = {
  key: "dev.to",
  label: "dev.to",
  icon: "devto",
  ci: "teal",
  match: { mode: EditorialMatchMode.Includes, value: "dev" },
};
const mediumTab: EditorialTabConfig = {
  key: "Medium",
  label: "Medium",
  icon: "medium",
  ci: "purple",
  match: { mode: EditorialMatchMode.Equals, value: "medium" },
};
const tabs: EditorialTabConfig[] = [allTab, devTab, mediumTab];

function article(overrides: Partial<Article>): Article {
  return {
    id: "id",
    platform: "dev.to",
    title: "Title",
    href: "https://example.com",
    date: "2025-01-01",
    readMin: 3,
    excerpt: "Excerpt",
    tags: [],
    active: true,
    ...overrides,
  };
}

const redisArticle = article({ id: "a", date: "2024-01-01", title: "Redis caching", tags: ["perf"] });
const queuesArticle = article({
  id: "b",
  date: "2025-06-01",
  platform: "Medium",
  title: "Queues",
  excerpt: "About Kafka",
});
const sample: Article[] = [
  redisArticle,
  queuesArticle,
  article({ id: "c", date: "2025-03-01", platform: "DEV Community", title: "APIs" }),
  article({ id: "d", date: "2026-01-01", active: false }),
];

describe("editorial article logic", () => {
  it("keeps only active articles, newest first", () => {
    expect(activeArticles(sample).map((entry) => entry.id)).toEqual(["b", "c", "a"]);
    expect(activeArticles([])).toEqual([]);
  });

  it("does not mutate its input", () => {
    const copy = [...sample];
    activeArticles(sample);
    expect(sample).toEqual(copy);
  });

  it("matches tabs by mode, case-insensitively on the article platform", () => {
    expect(articleMatchesTab({ platform: "anything" }, allTab)).toBe(true);
    expect(articleMatchesTab({ platform: "DEV Community" }, devTab)).toBe(true);
    expect(articleMatchesTab({ platform: "Medium" }, devTab)).toBe(false);
    expect(articleMatchesTab({ platform: "Medium" }, mediumTab)).toBe(true);
    expect(articleMatchesTab({ platform: "Medium.com" }, mediumTab)).toBe(false);
  });

  it("counts articles per tab", () => {
    const counts = buildPlatformTabs(activeArticles(sample), tabs).map((tab) => [tab.key, tab.count]);
    expect(counts).toEqual([
      ["all", 3],
      ["dev.to", 2],
      ["Medium", 1],
    ]);
    expect(buildPlatformTabs([], tabs).every((tab) => tab.count === 0)).toBe(true);
  });

  it("carries tab presentation through to the built tabs", () => {
    expect(buildPlatformTabs([], [devTab])[0]).toEqual({
      key: "dev.to",
      label: "dev.to",
      count: 0,
      icon: "devto",
      ci: "teal",
    });
  });

  it("filters by platform, and an unknown key shows everything", () => {
    const active = activeArticles(sample);
    expect(filterByPlatform(active, tabs, "Medium").map((entry) => entry.id)).toEqual(["b"]);
    expect(filterByPlatform(active, tabs, "dev.to").map((entry) => entry.id)).toEqual(["c", "a"]);
    expect(filterByPlatform(active, tabs, "all")).toHaveLength(3);
    expect(filterByPlatform(active, tabs, "nope")).toHaveLength(3);
  });

  it("searches title, excerpt, platform and tags, ignoring case and surrounding space", () => {
    expect(matchesSearch(redisArticle, "  REDIS ")).toBe(true);
    expect(matchesSearch(redisArticle, "perf")).toBe(true);
    expect(matchesSearch(queuesArticle, "kafka")).toBe(true);
    expect(matchesSearch(queuesArticle, "medium")).toBe(true);
    expect(matchesSearch(redisArticle, "kafka")).toBe(false);
    expect(matchesSearch(redisArticle, "   ")).toBe(true);
  });

  it("combines platform and search filters", () => {
    const active = activeArticles(sample);
    expect(filterArticles(active, tabs, "dev.to", "api").map((entry) => entry.id)).toEqual(["c"]);
    expect(filterArticles(active, tabs, "Medium", "api")).toEqual([]);
  });

  it("picks the platform icon, falling back when no tab claims the article", () => {
    expect(platformIconName("dev.to", tabs, "medium")).toBe("devto");
    expect(platformIconName("DEV Community", tabs, "medium")).toBe("devto");
    expect(platformIconName("Medium", tabs, "medium")).toBe("medium");
    expect(platformIconName("Hashnode", tabs, "fallback")).toBe("fallback");
  });

  it("formats the date label", () => {
    expect(articleDateLabel("2025-03-25", "en-GB", "T12:00:00")).toBe("25 Mar 2025");
    expect(articleDateLabel("not-a-date", "en-GB", "T12:00:00")).toBe("not-a-date");
    expect(articleDateLabel("", "en-GB", "T12:00:00")).toBe("");
  });

  it("falls back for blank excerpts", () => {
    expect(articleExcerpt("  Hello  ", "fallback")).toBe("Hello");
    expect(articleExcerpt("   ", "fallback")).toBe("fallback");
  });

  it("cycles row tints", () => {
    const tints = ["blue", "teal", "purple"];
    expect([0, 1, 2, 3, 4].map((index) => rowTint(index, tints))).toEqual(["blue", "teal", "purple", "blue", "teal"]);
  });

  it("count curve starts at 0, overshoots slightly, and lands exactly on 1", () => {
    expect(easeOutCubicOvershoot(0)).toBe(0);
    expect(easeOutCubicOvershoot(0.9)).toBeCloseTo(1, 10);
    expect(easeOutCubicOvershoot(0.95)).toBeCloseTo(1.025, 3);
    expect(easeOutCubicOvershoot(1)).toBeCloseTo(1, 10);
    expect(easeOutCubicOvershoot(0.5)).toBeGreaterThan(0.5);
  });

  it("picks the lens index: hover wins, else active, else first", () => {
    expect(pickLensIndex(1, 2)).toBe(2);
    expect(pickLensIndex(1, -1)).toBe(1);
    expect(pickLensIndex(1, undefined)).toBe(1);
    expect(pickLensIndex(-1, undefined)).toBe(0);
  });
});
