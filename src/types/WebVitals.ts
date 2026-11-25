import type { z } from "zod";
import type { vitalsSchema } from "../schemas/vitalsSchema";

export type VitalsConfig = z.infer<typeof vitalsSchema>;

/** The metrics collected per page view. Times are milliseconds; CLS is unitless. */
export const VITAL_METRICS = ["lcp", "cls", "inp", "fcp", "ttfb", "tbt"] as const;
export type VitalMetric = (typeof VITAL_METRICS)[number];
export type VitalRating = "good" | "needs-improvement" | "poor";

export interface MetricAttribution {
  /** Page section the measurement is attributed to (header, home, experience, …). */
  readonly section: string;
  /** Short element description, e.g. `img#heroBaseImg` (never page text). */
  readonly element: string;
}

/** What the browser reports (validated by the Worker before anything is stored). */
export interface VitalsPayload {
  readonly page: string;
  readonly navigationType: string;
  readonly metrics: Readonly<Partial<Record<VitalMetric, number>>>;
  readonly attribution: Readonly<Partial<Record<"lcp" | "cls" | "inp", MetricAttribution>>>;
  /** Per section: how long it was at least half visible, and how much layout shift it caused. */
  readonly sections: Readonly<Record<string, { readonly visibleMs: number; readonly cls: number }>>;
  readonly device: BrowserDevice;
}

/** Facts only the browser knows. No identifiers, no fingerprinting surface beyond what Client Hints already expose. */
export interface BrowserDevice {
  readonly model: string;
  readonly platform: string;
  readonly platformVersion: string;
  readonly architecture: string;
  readonly effectiveConnection: string;
  readonly downlinkMbps: number;
  readonly rttMs: number;
  readonly saveData: boolean;
  readonly memoryGb: number;
  readonly cores: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly devicePixelRatio: number;
  readonly reducedMotion: boolean;
  readonly colorScheme: string;
}

/** One stored page view: the browser's measurements plus what the edge knows about the client. */
export interface StoredVitals {
  readonly timestamp: string;
  readonly page: string;
  readonly navigationType: string;
  readonly country: string;
  readonly deviceType: string;
  readonly deviceVendor: string;
  readonly deviceModel: string;
  readonly browser: string;
  readonly browserVersion: string;
  readonly os: string;
  readonly osVersion: string;
  readonly effectiveConnection: string;
  readonly saveData: boolean;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly devicePixelRatio: number;
  readonly memoryGb: number;
  readonly cores: number;
  readonly metrics: Readonly<Partial<Record<VitalMetric, number>>>;
  readonly attribution: VitalsPayload["attribution"];
  readonly sections: VitalsPayload["sections"];
}

export interface MetricSummary {
  readonly samples: number;
  readonly percentile: number;
  readonly good: number;
  readonly needsImprovement: number;
  readonly poor: number;
}

export type MetricSummaries = Readonly<Partial<Record<VitalMetric, MetricSummary>>>;

export interface VitalsSummary {
  readonly samples: number;
  readonly percentile: number;
  readonly overall: MetricSummaries;
  readonly byDeviceType: Readonly<Record<string, MetricSummaries>>;
  readonly byBrowser: Readonly<Record<string, MetricSummaries>>;
  readonly byOs: Readonly<Record<string, MetricSummaries>>;
  readonly byDeviceModel: Readonly<Record<string, MetricSummaries>>;
  readonly byConnection: Readonly<Record<string, MetricSummaries>>;
  /** Per section: p-th percentile of time spent visible, of layout shift caused, and how often it hosted the LCP / INP element. */
  readonly bySection: Readonly<Record<string, SectionSummary>>;
}

export interface SectionSummary {
  readonly samples: number;
  readonly visibleMs: number;
  readonly cls: number;
  readonly lcpShare: number;
  readonly inpShare: number;
}
