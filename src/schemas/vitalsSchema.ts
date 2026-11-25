import { z } from "zod";

const positive = z.number().positive();
const threshold = z.strictObject({ good: positive, poor: positive });

export const vitalsSchema = z.strictObject({
  $comment: z.string().optional(),
  thresholds: z.strictObject({
    lcp: threshold,
    cls: threshold,
    inp: threshold,
    fcp: threshold,
    ttfb: threshold,
    tbt: threshold,
  }),
  /** Percentile reported in the summary (75 = what PageSpeed Insights field data uses). */
  percentile: z.number().int().min(1).max(99),
  sections: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)).min(1),
  ranges: z.strictObject({
    maxTimeMs: positive,
    maxCls: positive,
    maxDimensionPx: positive,
    maxMemoryGb: positive,
    maxCores: positive,
    maxDpr: positive,
  }),
  summary: z.strictObject({
    defaultDays: z.number().int().min(1),
    maxDays: z.number().int().min(1),
    defaultLimit: z.number().int().min(1),
    maxLimit: z.number().int().min(1),
  }),
});
