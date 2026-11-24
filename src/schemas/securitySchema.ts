import { z } from "zod";
import { regexSourceSchema } from "./regexSourceSchema";

const positiveInt = z.number().int().min(1);

const rateRuleSchema = z.strictObject({
  limit: positiveInt,
  windowSeconds: positiveInt,
});

export const securitySchema = z.strictObject({
  $comment: z.string().optional(),
  /** Methods the static site answers; anything else gets 405 before the asset store is touched. */
  allowedMethods: z.array(z.enum(["GET", "HEAD", "OPTIONS"])).min(1),
  limits: z.strictObject({
    maxUrlLength: positiveInt,
    maxContactBodyBytes: positiveInt,
    maxCspReportBytes: positiveInt,
    maxNameLength: positiveInt,
    maxEmailLength: positiveInt,
    maxProjectLength: positiveInt,
  }),
  /** Hidden form field real visitors leave empty; bots that fill every input trip it. */
  honeypotField: z.string().regex(/^[a-z][a-z0-9_]*$/),
  blockedPathPatterns: z.array(regexSourceSchema),
  rateLimits: z.strictObject({
    contact: rateRuleSchema,
    adminAuthFailure: rateRuleSchema,
    cspReport: rateRuleSchema,
  }),
});
