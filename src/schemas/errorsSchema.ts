import { z } from "zod";
import { ServiceState } from "../enums/ServiceState";

const nonEmptyString = z.string().min(1);

const errorActionSchema = z.strictObject({
  label: nonEmptyString,
  description: nonEmptyString,
  /** `{email}` is replaced with profile.email. */
  href: nonEmptyString.optional(),
  isReload: z.boolean().optional(),
});

const retryTuningSchema = z.strictObject({
  baseDelayMs: z.number().int().min(250),
  factor: z.number().min(1),
  maxDelayMs: z.number().int().min(250),
  maxAttempts: z.number().int().min(1).max(50),
  /** 0.2 = each delay varies by ±20 % so many visitors do not retry in lock-step. */
  jitterRatio: z.number().min(0).max(1),
  /** How often the countdown redraws (ms). */
  tickMs: z.number().int().min(50),
});

const retryPageSchema = z.strictObject({
  isEnabled: z.boolean(),
  baseDelayMs: retryTuningSchema.shape.baseDelayMs.optional(),
  factor: retryTuningSchema.shape.factor.optional(),
  maxDelayMs: retryTuningSchema.shape.maxDelayMs.optional(),
  maxAttempts: retryTuningSchema.shape.maxAttempts.optional(),
  reloadWhenOnline: z.boolean().optional(),
});

const serviceStateSchema = z.enum([ServiceState.Ok, ServiceState.Degraded, ServiceState.Down, ServiceState.Unknown]);

const pageServiceSchema = z.strictObject({
  /** Must exist in terminal.services.catalog. */
  id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
  state: serviceStateSchema,
  /** Short reason shown next to the state. */
  detail: nonEmptyString.optional(),
  /** `network`: the browser keeps this entry in sync with navigator.onLine (the build-time state is the fallback). */
  live: z.enum(["network"]).optional(),
});

const errorPageSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  /** Null for client-side conditions such as being offline. */
  status: z.number().int().min(400).max(599).nullable(),
  statusText: nonEmptyString,
  level: z.enum(["WARN", "ERROR"]),
  event: z.string().regex(/^[a-z0-9_]+$/),
  actor: nonEmptyString,
  title: nonEmptyString,
  message: nonEmptyString,
  reason: nonEmptyString,
  hint: nonEmptyString,
  /** The shell command echoed at the prompt; `{url}` is replaced in the browser. */
  command: nonEmptyString,
  actions: z.array(errorActionSchema).min(1),
  retry: retryPageSchema,
  /** Services this page reports on, in display order. */
  services: z.array(pageServiceSchema).default([]),
});

export const errorsSchema = z
  .strictObject({
  $comment: z.string().optional(),
  terminal: z.strictObject({
    windowTitle: nonEmptyString,
    userName: nonEmptyString,
    hostName: nonEmptyString,
    promptSymbol: nonEmptyString,
    labels: z.strictObject({
      when: nonEmptyString,
      who: nonEmptyString,
      what: nonEmptyString,
      where: nonEmptyString,
      why: nonEmptyString,
      hint: nonEmptyString,
      ref: nonEmptyString,
    }),
    unknownValue: nonEmptyString,
    well: z.strictObject({
      /** Verb shown before the request path in the status well (error pages are always reached by a GET navigation). */
      requestVerb: nonEmptyString,
    }),
    orb: z.strictObject({
      /** Shown inside the orb on pages without a status code or a countdown. */
      idleGlyph: nonEmptyString,
      /** Unit label under the countdown number. */
      secondsLabel: nonEmptyString,
    }),
    footer: nonEmptyString,
    services: z.strictObject({
      /** Small caps label above the list. */
      heading: nonEmptyString,
      /** Display text for each ServiceState. */
      states: z.strictObject({ ok: nonEmptyString, degraded: nonEmptyString, down: nonEmptyString, unknown: nonEmptyString }),
      /** Every service the pages may report: id → label. Add new ones (cache, data source, …) here. */
      catalog: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/), nonEmptyString),
    }),
    retry: z.strictObject({
      attemptLabel: nonEmptyString,
      waitingLabel: nonEmptyString,
      secondsSuffix: nonEmptyString,
      /** `{attempts}` is replaced with the number of tries made. */
      exhausted: nonEmptyString,
      reconnected: nonEmptyString,
      /** `{seconds}` is replaced with the first delay, for screen readers. */
      srAnnouncement: nonEmptyString,
    }),
  }),
  retryDefaults: retryTuningSchema,
  pages: z.record(z.string().regex(/^[a-z0-9-]+$/), errorPageSchema),
  })
  .superRefine((catalog, context) => {
    for (const [pageKey, page] of Object.entries(catalog.pages)) {
      page.services.forEach((service, index) => {
        if (service.id in catalog.terminal.services.catalog) return;
        context.addIssue({
          code: "custom",
          path: ["pages", pageKey, "services", index, "id"],
          message: `unknown service "${service.id}": add it to terminal.services.catalog first`,
        });
      });
    }
  });
