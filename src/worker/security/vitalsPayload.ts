import {
  VITAL_METRICS,
  type BrowserDevice,
  type MetricAttribution,
  type VitalsConfig,
  type VitalsPayload,
} from "../../types/WebVitals";
import { toSingleLine } from "./contactPayload";

const MAX_TEXT_LENGTH = 80;
const MAX_ELEMENT_LENGTH = 120;
const SAFE_TEXT = /[^\w .:/#@()+-]/g;
const ROUNDING = 1000;

type Source = Readonly<Record<string, unknown>>;

function asRecord(value: unknown): Source {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Source) : {};
}

/** Short printable text with no control characters or markup-ish punctuation; never page content. */
function readText(value: unknown, maxLength = MAX_TEXT_LENGTH): string {
  return typeof value === "string" ? toSingleLine(value).replace(SAFE_TEXT, "").slice(0, maxLength) : "";
}

/** A finite number clamped to [0, max]; undefined when the value is not a number at all. */
function readNumber(value: unknown, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.round(Math.min(Math.max(value, 0), max) * ROUNDING) / ROUNDING;
}

function readAttribution(value: unknown, config: VitalsConfig): MetricAttribution | undefined {
  const source = asRecord(value);
  const section = readText(source["section"]);
  if (!config.sections.includes(section)) return undefined;
  return { section, element: readText(source["element"], MAX_ELEMENT_LENGTH) };
}

function readDevice(value: unknown, config: VitalsConfig): BrowserDevice {
  const source = asRecord(value);
  const { ranges } = config;
  return {
    model: readText(source["model"]),
    platform: readText(source["platform"]),
    platformVersion: readText(source["platformVersion"]),
    architecture: readText(source["architecture"]),
    effectiveConnection: readText(source["effectiveConnection"]),
    downlinkMbps: readNumber(source["downlinkMbps"], ranges.maxDimensionPx) ?? 0,
    rttMs: readNumber(source["rttMs"], ranges.maxTimeMs) ?? 0,
    saveData: source["saveData"] === true,
    memoryGb: readNumber(source["memoryGb"], ranges.maxMemoryGb) ?? 0,
    cores: readNumber(source["cores"], ranges.maxCores) ?? 0,
    viewportWidth: readNumber(source["viewportWidth"], ranges.maxDimensionPx) ?? 0,
    viewportHeight: readNumber(source["viewportHeight"], ranges.maxDimensionPx) ?? 0,
    devicePixelRatio: readNumber(source["devicePixelRatio"], ranges.maxDpr) ?? 0,
    reducedMotion: source["reducedMotion"] === true,
    colorScheme: readText(source["colorScheme"], 16),
  };
}

function readSections(value: unknown, config: VitalsConfig): VitalsPayload["sections"] {
  const source = asRecord(value);
  const result: Record<string, { visibleMs: number; cls: number }> = {};
  for (const section of config.sections) {
    const entry = source[section];
    if (entry === undefined) continue;
    const record = asRecord(entry);
    result[section] = {
      visibleMs: readNumber(record["visibleMs"], config.ranges.maxTimeMs) ?? 0,
      cls: readNumber(record["cls"], config.ranges.maxCls) ?? 0,
    };
  }
  return result;
}

/**
 * Validates an untrusted beacon body. Unknown keys are ignored, numbers are clamped to the ranges in vitals.json, text is
 * reduced to a short safe alphabet, attribution outside the configured sections is dropped. Returns undefined when there
 * is nothing worth storing (no metric at all).
 */
export function parseVitalsPayload(body: unknown, config: VitalsConfig): VitalsPayload | undefined {
  const source = asRecord(body);
  const metricsSource = asRecord(source["metrics"]);
  const metrics: Partial<Record<(typeof VITAL_METRICS)[number], number>> = {};
  for (const metric of VITAL_METRICS) {
    const value = readNumber(metricsSource[metric], metric === "cls" ? config.ranges.maxCls : config.ranges.maxTimeMs);
    if (value !== undefined) metrics[metric] = value;
  }
  if (Object.keys(metrics).length === 0) return undefined;

  const attributionSource = asRecord(source["attribution"]);
  const attribution: Partial<Record<"lcp" | "cls" | "inp", MetricAttribution>> = {};
  for (const key of ["lcp", "cls", "inp"] as const) {
    const entry = readAttribution(attributionSource[key], config);
    if (entry) attribution[key] = entry;
  }
  return {
    page: readText(source["page"], MAX_ELEMENT_LENGTH) || "/",
    navigationType: readText(source["navigationType"], 24),
    metrics,
    attribution,
    sections: readSections(source["sections"], config),
    device: readDevice(source["device"], config),
  };
}
