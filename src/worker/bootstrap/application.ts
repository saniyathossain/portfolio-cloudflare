import loggingConfigJson from "../../content/logging.json";
import type { LoggingConfig } from "../../types/LoggingConfig";
import { ContactController } from "../controllers/ContactController";
import { CspReportController } from "../controllers/CspReportController";
import { StaticSiteResponder } from "../http/StaticSiteResponder";
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
  const { config, clientProfiles } = securityServices;
  // Isolate-local counters, used when neither the rate-limit binding nor KV is available.
  const memoryCounters = new Map<string, number>();
  return new WorkerApplication({
    security: securityServices,
    contact: new ContactController({ config, clientProfiles, turnstile: new TurnstileVerifier(), memoryCounters }),
    cspReports: new CspReportController(config, clientProfiles, memoryCounters),
    staticSite: new StaticSiteResponder(),
  });
}

export const workerApplication: WorkerApplication = createWorkerApplication();
