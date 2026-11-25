import { EnvVar } from "../../enums/EnvVar";
import type { SecurityConfig } from "../../types/SecurityConfig";
import type { CollectVitalsAction } from "../actions/CollectVitalsAction";
import type { SummarizeVitalsAction } from "../actions/SummarizeVitalsAction";
import type { Logger } from "../logging/Logger";
import { createVitalsRepository } from "../repositories/factories";
import { AdminAuthenticator } from "../security/AdminAuthenticator";
import { createRateLimiter } from "../security/rateLimiter";
import type { WorkerEnvironment } from "../types/WorkerEnvironment";

export interface VitalsControllerDependencies {
  readonly collect: CollectVitalsAction;
  readonly summarize: SummarizeVitalsAction;
  readonly memoryCounters: Map<string, number>;
}

/** `/api/vitals` routing only: `GET` is the owner-only field-data summary, everything else is a beacon. */
export class VitalsController {
  constructor(private readonly dependencies: VitalsControllerDependencies) {}

  handle(request: Request, environment: WorkerEnvironment, logger: Logger, config: SecurityConfig): Promise<Response> {
    // Resolved by the actions only after their cheap gates (feature flag, origin, bot, rate limit, auth) pass.
    const repository = () =>
      createVitalsRepository(environment, config.vitalsRetentionDays, logger.forActor("VitalsRepository"));
    const { collect, summarize, memoryCounters } = this.dependencies;
    if (request.method !== "GET") return collect.execute(request, environment, logger, config, repository);

    const adminToken = environment[EnvVar.AdminToken];
    const authenticator = new AdminAuthenticator(
      typeof adminToken === "string" ? adminToken : undefined,
      createRateLimiter(environment, memoryCounters),
      config.rateLimits.adminAuthFailure,
    );
    return summarize.execute(request, logger, authenticator, repository);
  }
}
