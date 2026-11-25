import {
  VITAL_METRICS,
  type MetricSummaries,
  type MetricSummary,
  type SectionSummary,
  type StoredVitals,
  type VitalMetric,
  type VitalRating,
  type VitalsConfig,
  type VitalsSummary,
} from "../types/WebVitals";

const PERCENT = 100;
const ROUNDING_DIGITS = 3;
const UNKNOWN_GROUP = "unknown";

export function rateVital(metric: VitalMetric, value: number, thresholds: VitalsConfig["thresholds"]): VitalRating {
  const { good, poor } = thresholds[metric];
  if (value <= good) return "good";
  return value <= poor ? "needs-improvement" : "poor";
}

/** Nearest-rank percentile (`rankPercent` in 1..99) of a list of numbers; 0 for an empty list. */
export function percentile(values: readonly number[], rankPercent: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((first, second) => first - second);
  const rank = Math.ceil((rankPercent / PERCENT) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1] ?? 0;
}

function round(value: number): number {
  const factor = 10 ** ROUNDING_DIGITS;
  return Math.round(value * factor) / factor;
}

function summarizeMetric(metric: VitalMetric, rows: readonly StoredVitals[], config: VitalsConfig): MetricSummary | undefined {
  const values = rows.map((row) => row.metrics[metric]).filter((value): value is number => value !== undefined);
  if (values.length === 0) return undefined;
  const counts = { good: 0, "needs-improvement": 0, poor: 0 };
  for (const value of values) counts[rateVital(metric, value, config.thresholds)]++;
  return {
    samples: values.length,
    percentile: round(percentile(values, config.percentile)),
    good: round(counts.good / values.length),
    needsImprovement: round(counts["needs-improvement"] / values.length),
    poor: round(counts.poor / values.length),
  };
}

export function summarizeMetrics(rows: readonly StoredVitals[], config: VitalsConfig): MetricSummaries {
  const summaries: Partial<Record<VitalMetric, MetricSummary>> = {};
  for (const metric of VITAL_METRICS) {
    const summary = summarizeMetric(metric, rows, config);
    if (summary) summaries[metric] = summary;
  }
  return summaries;
}

function groupSummaries(
  rows: readonly StoredVitals[],
  config: VitalsConfig,
  keyOf: (row: StoredVitals) => string,
): Record<string, MetricSummaries> {
  const groups = new Map<string, StoredVitals[]>();
  for (const row of rows) {
    const key = keyOf(row).trim() || UNKNOWN_GROUP;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return Object.fromEntries([...groups].map(([key, members]) => [key, summarizeMetrics(members, config)]));
}

function summarizeSections(rows: readonly StoredVitals[], config: VitalsConfig): Record<string, SectionSummary> {
  const result: Record<string, SectionSummary> = {};
  for (const section of config.sections) {
    const entries = rows.flatMap((row) => (row.sections[section] ? [row.sections[section]] : []));
    const lcpHits = rows.filter((row) => row.attribution.lcp?.section === section).length;
    const inpHits = rows.filter((row) => row.attribution.inp?.section === section).length;
    if (entries.length === 0 && lcpHits === 0 && inpHits === 0) continue;
    result[section] = {
      samples: entries.length,
      visibleMs: Math.round(percentile(entries.map((entry) => entry.visibleMs), config.percentile)),
      cls: round(percentile(entries.map((entry) => entry.cls), config.percentile)),
      lcpShare: rows.length === 0 ? 0 : round(lcpHits / rows.length),
      inpShare: rows.length === 0 ? 0 : round(inpHits / rows.length),
    };
  }
  return result;
}

/** PageSpeed-style field summary: percentile + good / needs-improvement / poor shares, overall and by device facets. */
export function summarizeVitals(rows: readonly StoredVitals[], config: VitalsConfig): VitalsSummary {
  return {
    samples: rows.length,
    percentile: config.percentile,
    overall: summarizeMetrics(rows, config),
    byDeviceType: groupSummaries(rows, config, (row) => row.deviceType),
    byBrowser: groupSummaries(rows, config, (row) => (row.browser ? `${row.browser} ${row.browserVersion.split(".")[0] ?? ""}`.trim() : "")),
    byOs: groupSummaries(rows, config, (row) => (row.os ? `${row.os} ${row.osVersion.split(".")[0] ?? ""}`.trim() : "")),
    byDeviceModel: groupSummaries(rows, config, (row) => [row.deviceVendor, row.deviceModel].filter(Boolean).join(" ")),
    byConnection: groupSummaries(rows, config, (row) => row.effectiveConnection),
    bySection: summarizeSections(rows, config),
  };
}
