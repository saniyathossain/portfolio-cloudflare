import loggingConfigJson from "../../content/logging.json";
import type { LoggingConfig } from "../../types/LoggingConfig";
import { ListContactSubmissionsAction } from "../actions/ListContactSubmissionsAction";
import { SubmitContactAction } from "../actions/SubmitContactAction";
import { ContactController } from "../controllers/ContactController";
import { CspReportController } from "../controllers/CspReportController";
import { StaticSiteResponder } from "../http/StaticSiteResponder";
import { KvContactSubmissionRepository } from "../repositories/ContactSubmissionRepository";
import { EmailRoutingNotifier } from "../services/ContactNotifier";
import { TurnstileVerifier } from "../services/TurnstileVerifier";
import { WorkerApplication } from "../WorkerApplication";
import { securityServices } from "./container";

/** Validated by `loggingSchema` in the test suite; the cast here is a typed contract, not a guess. */
export const loggingConfig = loggingConfigJson as unknown as LoggingConfig;

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
    contact: new ContactController({ submit, list: new ListContactSubmissionsAction({ clientProfiles }), memoryCounters }),
    cspReports: new CspReportController(clientProfiles, memoryCounters),
    staticSite: new StaticSiteResponder(),
  });
}

export const workerApplication: WorkerApplication = createWorkerApplication();
