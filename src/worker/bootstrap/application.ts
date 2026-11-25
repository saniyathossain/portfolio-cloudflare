import loggingConfigJson from "../../content/logging.json";
import vitalsConfigJson from "../../content/vitals.json";
import type { LoggingConfig } from "../../types/LoggingConfig";
import type { VitalsConfig } from "../../types/WebVitals";
import { CollectVitalsAction } from "../actions/CollectVitalsAction";
import { ListContactSubmissionsAction } from "../actions/ListContactSubmissionsAction";
import { SubmitContactAction } from "../actions/SubmitContactAction";
import { SummarizeVitalsAction } from "../actions/SummarizeVitalsAction";
import { ContactController } from "../controllers/ContactController";
import { CspReportController } from "../controllers/CspReportController";
import { VitalsController } from "../controllers/VitalsController";
import { StaticSiteResponder } from "../http/StaticSiteResponder";
import { KvContactSubmissionRepository } from "../repositories/ContactSubmissionRepository";
import { EmailRoutingNotifier } from "../services/ContactNotifier";
import { TurnstileVerifier } from "../services/TurnstileVerifier";
import { WorkerApplication } from "../WorkerApplication";
import { securityServices } from "./container";

/** Validated by `loggingSchema` in the test suite; the cast here is a typed contract, not a guess. */
export const loggingConfig = loggingConfigJson as unknown as LoggingConfig;
/** Same contract for src/content/vitals.json (validated by `vitalsSchema` in the test suite). */
const vitalsConfig = vitalsConfigJson as unknown as VitalsConfig;

/**
 * Composition root for the whole Worker (the Laravel "service provider"): builds every collaborator once per isolate
 * and wires them into the request pipeline. `src/index.ts` stays a three-line adapter.
 */
function createWorkerApplication(): WorkerApplication {
  const { clientProfiles } = securityServices;
  // Isolate-local counters, used when neither the rate-limit binding nor KV is available.
  const memoryCounters = new Map<string, number>();
  const submit = new SubmitContactAction({
    clientProfiles,
    turnstile: new TurnstileVerifier(),
    memoryCounters,
    createRepository: (environment, config, logger) =>
      new KvContactSubmissionRepository(environment.CONTACT_KV, config.contactRetentionSeconds, logger),
    createNotifier: (environment, logger) =>
      new EmailRoutingNotifier(environment.CONTACT_EMAIL, environment.CONTACT_FROM, environment.CONTACT_TO, logger),
  });
  return new WorkerApplication({
    security: securityServices,
    contact: new ContactController({
      submit,
      list: new ListContactSubmissionsAction({ clientProfiles }),
      memoryCounters,
    }),
    cspReports: new CspReportController(clientProfiles, memoryCounters),
    vitals: new VitalsController({
      collect: new CollectVitalsAction({ clientProfiles, vitalsConfig, memoryCounters }),
      summarize: new SummarizeVitalsAction({ clientProfiles, vitalsConfig }),
      memoryCounters,
    }),
    staticSite: new StaticSiteResponder(),
  });
}

export const workerApplication: WorkerApplication = createWorkerApplication();
