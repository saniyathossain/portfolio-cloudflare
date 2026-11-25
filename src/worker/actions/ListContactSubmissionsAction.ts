import { HttpStatus } from "../../enums/HttpStatus";
import type { SecurityConfig } from "../../types/SecurityConfig";
import { describeRequestMeta, logApiAccess } from "../http/apiAccessLog";
import { jsonResponse } from "../http/jsonResponse";
import type { Logger } from "../logging/Logger";
import type { ContactSubmissionRepository } from "../repositories/ContactSubmissionRepository";
import type { AdminAuthenticator } from "../security/AdminAuthenticator";
import type { ClientProfileService } from "../services/ClientProfileService";

export interface ListContactDependencies {
  readonly clientProfiles: ClientProfileService;
}

/** `GET /api/contact` (owner only): the most recent stored submissions, newest first. */
export class ListContactSubmissionsAction {
  constructor(private readonly dependencies: ListContactDependencies) {}

  async execute(
    request: Request,
    logger: Logger,
    config: SecurityConfig,
    authenticator: AdminAuthenticator,
    repository: ContactSubmissionRepository,
  ): Promise<Response> {
    const meta = describeRequestMeta(request, this.dependencies.clientProfiles);
    const contactLogger = logger.forActor("ListContactSubmissionsAction");

    const refused = await authenticator.refuse(request, meta.ip, contactLogger);
    if (refused) return refused;

    if (!repository.isConfigured) return jsonResponse({ count: 0, items: [], note: "kv_not_configured" }, HttpStatus.Ok);
    const items = await repository.recent(this.pageSize(new URL(request.url).searchParams.get("limit"), config));
    logApiAccess(contactLogger, { status: HttpStatus.Ok, outcome: "list", count: items.length, ...meta });
    return jsonResponse({ count: items.length, items }, HttpStatus.Ok);
  }

  /** `?limit` clamped to [1, adminList.maxLimit]; a missing or non-numeric value means the default page size. */
  private pageSize(requested: string | null, config: SecurityConfig): number {
    const { defaultLimit, maxLimit } = config.adminList;
    const parsed = Number.parseInt(requested ?? "", 10);
    return Math.min(Number.isNaN(parsed) || parsed < 1 ? defaultLimit : parsed, maxLimit);
  }
}
