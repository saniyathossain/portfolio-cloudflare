import type { MetricAttribution, VitalMetric } from "../../../types/WebVitals";
import { describeElement, observedSections, sectionOf } from "./sections";

/** Browser entry types TypeScript's DOM lib does not ship yet. */
interface LayoutShiftSource {
  readonly node: Node | null;
  readonly previousRect: DOMRectReadOnly;
  readonly currentRect: DOMRectReadOnly;
}

interface LayoutShiftEntry extends PerformanceEntry {
  readonly value: number;
  readonly hadRecentInput: boolean;
  readonly sources: readonly LayoutShiftSource[];
}

interface LargestContentfulPaintEntry extends PerformanceEntry {
  readonly element: Element | null;
}

interface EventTimingEntry extends PerformanceEntry {
  readonly interactionId?: number;
  readonly target: Node | null;
}

const SESSION_GAP_MS = 1000;
const SESSION_MAX_MS = 5000;
const LONG_TASK_BASELINE_MS = 50;
const EVENT_DURATION_THRESHOLD_MS = 40;
const INTERACTIONS_PER_INP_STEP = 50;
const HALF_VISIBLE = 0.5;

export interface CollectedVitals {
  readonly metrics: Partial<Record<VitalMetric, number>>;
  readonly attribution: Partial<Record<"lcp" | "cls" | "inp", MetricAttribution>>;
  readonly sections: Record<string, { visibleMs: number; cls: number }>;
}

interface Interaction {
  duration: number;
  section: string;
  element: string;
}

/**
 * Collects Core Web Vitals (LCP, CLS, INP, FCP, TTFB) plus total blocking time and per-section data (time half-visible,
 * layout shift caused) with plain PerformanceObservers — the same definitions PageSpeed Insights field data uses, in a few
 * hundred bytes instead of a library. `snapshot()` can be called at any time.
 */
export class VitalsCollector {
  private lcp: { value: number; attribution: MetricAttribution } | undefined;
  private fcp: number | undefined;
  private clsValue = 0;
  private clsWindow = { value: 0, start: 0, last: 0 };
  private clsWorst = { value: 0, attribution: undefined as MetricAttribution | undefined };
  private totalBlockingMs = 0;
  private readonly interactions = new Map<number, Interaction>();
  private readonly sectionCls = new Map<string, number>();
  private readonly sectionVisible = new Map<string, number>();
  private readonly visibleSince = new Map<string, number>();

  start(): void {
    this.observe("largest-contentful-paint", (entries) => {
      const last = entries[entries.length - 1] as LargestContentfulPaintEntry | undefined;
      if (last)
        {this.lcp = {
          value: last.startTime,
          attribution: { section: sectionOf(last.element), element: describeElement(last.element) },
        };}
    });
    this.observe("paint", (entries) => {
      for (const entry of entries) if (entry.name === "first-contentful-paint") this.fcp = entry.startTime;
    });
    this.observe("layout-shift", (entries) => {
      for (const entry of entries as LayoutShiftEntry[]) this.recordLayoutShift(entry);
    });
    this.observe("longtask", (entries) => {
      for (const entry of entries) {
        if (this.fcp !== undefined && entry.startTime >= this.fcp)
          {this.totalBlockingMs += Math.max(0, entry.duration - LONG_TASK_BASELINE_MS);}
      }
    });
    this.observe(
      "event",
      (entries) => {
        for (const entry of entries as EventTimingEntry[]) this.recordInteraction(entry);
      },
      { durationThreshold: EVENT_DURATION_THRESHOLD_MS },
    );
    this.observeSectionVisibility();
  }

  snapshot(): CollectedVitals {
    const metrics: Partial<Record<VitalMetric, number>> = {};
    const attribution: CollectedVitals["attribution"] = {};
    this.collectPaintMetrics(metrics, attribution);
    this.collectResponsiveness(metrics, attribution);
    return { metrics, attribution, sections: this.collectSections() };
  }

  private collectPaintMetrics(
    metrics: Partial<Record<VitalMetric, number>>,
    attribution: CollectedVitals["attribution"],
  ): void {
    if (this.lcp) {
      metrics.lcp = this.lcp.value;
      attribution.lcp = this.lcp.attribution;
    }
    if (this.fcp !== undefined) {
      metrics.fcp = this.fcp;
      metrics.tbt = this.totalBlockingMs;
    }
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation) metrics.ttfb = navigation.responseStart;
    metrics.cls = this.clsValue;
    if (this.clsWorst.attribution) attribution.cls = this.clsWorst.attribution;
  }

  private collectResponsiveness(
    metrics: Partial<Record<VitalMetric, number>>,
    attribution: CollectedVitals["attribution"],
  ): void {
    const inp = this.interactionToNextPaint();
    if (!inp) return;
    metrics.inp = inp.duration;
    attribution.inp = { section: inp.section, element: inp.element };
  }

  private collectSections(): CollectedVitals["sections"] {
    const now = performance.now();
    const sections: CollectedVitals["sections"] = {};
    for (const element of observedSections()) {
      const since = this.visibleSince.get(element.id);
      const visible = (this.sectionVisible.get(element.id) ?? 0) + (since === undefined ? 0 : now - since);
      sections[element.id] = { visibleMs: visible, cls: this.sectionCls.get(element.id) ?? 0 };
    }
    for (const [section, value] of this.sectionCls) {
      sections[section] ??= { visibleMs: 0, cls: value };
    }
    return sections;
  }

  private observe(
    type: string,
    handler: (entries: PerformanceEntry[]) => void,
    extra: Record<string, unknown> = {},
  ): void {
    try {
      const observer = new PerformanceObserver((list) => {
        handler(list.getEntries());
      });
      observer.observe({ type, buffered: true, ...extra });
    } catch {
      // Entry type not supported by this browser: that metric is simply absent.
    }
  }

  /** CLS = the worst "session window" of shifts (gap < 1 s, window < 5 s), like the web-vitals definition. */
  private recordLayoutShift(entry: LayoutShiftEntry): void {
    if (entry.hadRecentInput) return;
    const largest = entry.sources.reduce<LayoutShiftSource | undefined>((best, source) => {
      const area = source.currentRect.width * source.currentRect.height;
      return best === undefined || area > best.currentRect.width * best.currentRect.height ? source : best;
    }, undefined);
    const section = sectionOf(largest?.node);
    this.sectionCls.set(section, (this.sectionCls.get(section) ?? 0) + entry.value);

    const window = this.clsWindow;
    if (
      window.value > 0 &&
      entry.startTime - window.last < SESSION_GAP_MS &&
      entry.startTime - window.start < SESSION_MAX_MS
    ) {
      window.value += entry.value;
    } else {
      window.value = entry.value;
      window.start = entry.startTime;
    }
    window.last = entry.startTime;
    if (window.value > this.clsValue) this.clsValue = window.value;
    if (entry.value > this.clsWorst.value) {
      this.clsWorst = { value: entry.value, attribution: { section, element: describeElement(largest?.node) } };
    }
  }

  private recordInteraction(entry: EventTimingEntry): void {
    if (!entry.interactionId) return;
    const current = this.interactions.get(entry.interactionId);
    if (current && current.duration >= entry.duration) return;
    this.interactions.set(entry.interactionId, {
      duration: entry.duration,
      section: sectionOf(entry.target),
      element: describeElement(entry.target),
    });
  }

  /** INP: the slowest interaction, ignoring one outlier per 50 interactions (web-vitals' definition). */
  private interactionToNextPaint(): Interaction | undefined {
    const sorted = [...this.interactions.values()].sort((first, second) => second.duration - first.duration);
    return sorted[Math.min(sorted.length - 1, Math.floor(this.interactions.size / INTERACTIONS_PER_INP_STEP))];
  }

  private observeSectionVisibility(): void {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const now = performance.now();
        for (const entry of entries) {
          const id = entry.target.id;
          const since = this.visibleSince.get(id);
          if (entry.isIntersecting && since === undefined) {
            this.visibleSince.set(id, now);
          } else if (!entry.isIntersecting && since !== undefined) {
            this.sectionVisible.set(id, (this.sectionVisible.get(id) ?? 0) + (now - since));
            this.visibleSince.delete(id);
          }
        }
      },
      { threshold: HALF_VISIBLE },
    );
    for (const element of observedSections()) observer.observe(element);
  }
}
