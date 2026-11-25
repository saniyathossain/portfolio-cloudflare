import { EnvVar } from "../../enums/EnvVar";
import type { SecurityConfig } from "../../types/SecurityConfig";
import type { ListContactSubmissionsAction } from "../actions/ListContactSubmissionsAction";
import type { SubmitContactAction } from "../actions/SubmitContactAction";
import type { Logger } from "../logging/Logger";
import { KvContactSubmissionRepository } from "../repositories/ContactSubmissionRepository";
import { AdminAuthenticator } from "../security/AdminAuthenticator";
import { createRateLimiter } from "../security/rateLimiter";
import type { WorkerEnvironment } from "../types/WorkerEnvironment";

export interface ContactControllerDependencies {
  readonly submit: SubmitContactAction;
  readonly list: ListContactSubmissionsAction;
  /** Isolate-local counters, used when neither the rate-limit binding nor KV is available. */
  readonly memoryCounters: Map<string, number>;
}

/**
 * `/api/contact` routing only: `GET` is the owner-only read, everything else is a submission. The work lives in the
 * two action classes; this class wires each request's environment-dependent collaborators (config, repository,
 * authenticator) and hands them over.
 */
export class ContactController {
  constructor(private readonly dependencies: ContactControllerDependencies) {}

  handle(request: Request, environment: WorkerEnvironment, logger: Logger, config: SecurityConfig): Promise<Response> {
    if (request.method !== "GET") return this.dependencies.submit.execute(request, environment, logger, config);

    const { list, memoryCounters } = this.dependencies;
    const adminToken = environment[EnvVar.AdminToken];
    const authenticator = new AdminAuthenticator(
      typeof adminToken === "string" ? adminToken : undefined,
      createRateLimiter(environment, memoryCounters),
      config.rateLimits.adminAuthFailure,
    );
    const repository = new KvContactSubmissionRepository(environment.CONTACT_KV, config.contactRetentionSeconds, logger.forActor("ContactSubmissionRepository"));
    return list.execute(request, logger, config, authenticator, repository);
  }
}
