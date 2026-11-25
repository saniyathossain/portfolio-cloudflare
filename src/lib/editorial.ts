import { EditorialMatchMode } from "../enums/EditorialMatchMode";
import type { Article } from "../types/Portfolio";
import type { UiConfig } from "../types/UiConfig";

/** One platform tab as configured in ui.json (`editorial.tabs`). */
export type EditorialTabConfig = UiConfig["editorial"]["tabs"][number];

/** A configured tab plus how many active articles it holds. */
export interface PlatformTab {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly icon: string | null;
  readonly ci: string;
}

const EXPONENT_CUBIC = 3;
/** Fraction of the progress curve spent on the plain ease-out before the overshoot tail begins. */
const OVERSHOOT_START = 0.9;
const OVERSHOOT_AMPLITUDE = 0.025;

function normalizedPlatform(article: Pick<Article, "platform">): string {
  return article.platform.toLowerCase();
}

/** Does the article belong to this tab? ("all" claims everything.) */
export function articleMatchesTab(article: Pick<Article, "platform">, tab: EditorialTabConfig): boolean {
  const platform = normalizedPlatform(article);
  switch (tab.match.mode) {
    case EditorialMatchMode.All:
      return true;
    case EditorialMatchMode.Includes:
      return platform.includes(tab.match.value);
    case EditorialMatchMode.Equals:
      return platform === tab.match.value;
  }
}

/** Active articles only, newest first (ISO dates compare lexicographically). */
export function activeArticles(articles: readonly Article[]): Article[] {
  return articles.filter((article) => article.active).sort((left, right) => right.date.localeCompare(left.date));
}

export function buildPlatformTabs(articles: readonly Article[], tabs: readonly EditorialTabConfig[]): PlatformTab[] {
  return tabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    count: articles.filter((article) => articleMatchesTab(article, tab)).length,
    icon: tab.icon,
    ci: tab.ci,
  }));
}

export function filterByPlatform(
  articles: readonly Article[],
  tabs: readonly EditorialTabConfig[],
  filterKey: string,
): Article[] {
  const tab = tabs.find((candidate) => candidate.key === filterKey);
  if (!tab) return [...articles];
  return articles.filter((article) => articleMatchesTab(article, tab));
}

/** Case-insensitive substring search over title, excerpt, platform and tags; a blank query matches everything. */
export function matchesSearch(article: Article, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [article.title, article.excerpt, article.platform, ...article.tags].join(" ").toLowerCase();
  return haystack.includes(needle);
}

export function filterArticles(
  articles: readonly Article[],
  tabs: readonly EditorialTabConfig[],
  filterKey: string,
  query: string,
): Article[] {
  return filterByPlatform(articles, tabs, filterKey).filter((article) => matchesSearch(article, query));
}

/** Icon of the first platform tab that claims the article, else the configured fallback. */
export function platformIconName(platform: string, tabs: readonly EditorialTabConfig[], fallbackIcon: string): string {
  const claiming = tabs.find((tab) => tab.icon !== null && articleMatchesTab({ platform }, tab));
  return claiming?.icon ?? fallbackIcon;
}

/** "25 Mar 2025" style label; an unparseable date is shown as-is, a missing one as an empty string. */
export function articleDateLabel(date: string, locale: string, timeSuffix: string): string {
  if (!date) return "";
  const parsed = new Date(`${date}${timeSuffix}`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

export function articleExcerpt(excerpt: string, fallbackExcerpt: string): string {
  const text = excerpt.trim();
  return text || fallbackExcerpt;
}

/** Cycles the configured tint hues by row index. */
export function rowTint(index: number, tints: readonly string[]): string {
  return tints[index % tints.length] ?? "";
}

/**
 * easeOutCubic for the first 90% of progress, then a ~2.5% overshoot-and-settle so a rolling number ticks
 * slightly past its target and lands back exactly on it (same curve as the stat counters).
 */
export function easeOutCubicOvershoot(progress: number): number {
  if (progress < OVERSHOOT_START) return 1 - Math.pow(1 - progress / OVERSHOOT_START, EXPONENT_CUBIC);
  const tail = (progress - OVERSHOOT_START) / (1 - OVERSHOOT_START);
  return 1 + OVERSHOOT_AMPLITUDE * Math.sin(tail * Math.PI);
}

/** Which tab button the lens sits under: the hovered/focused one, else the active one, else the first. */
export function pickLensIndex(activeIndex: number, hoverIndex: number | undefined): number {
  if (hoverIndex !== undefined && hoverIndex >= 0) return hoverIndex;
  return activeIndex >= 0 ? activeIndex : 0;
}

export type EditorialIconSize = "sm" | "md";

/** Key under which the server-rendered icon markup for `name` at `size` is passed to the island. */
export function editorialIconKey(name: string, size: EditorialIconSize): string {
  return `${name}:${size}`;
}
