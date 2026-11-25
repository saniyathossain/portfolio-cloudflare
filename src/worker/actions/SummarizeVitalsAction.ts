import { HttpStatus } from "../../enums/HttpStatus";
import { summarizeVitals } from "../../lib/webVitals";
import type { VitalsConfig } from "../../types/WebVitals";
import { describeRequestMeta, logApiAccess } from "../http/apiAccessLog";
import { jsonResponse } from "../http/jsonResponse";
import type { Logger } from "../logging/Logger";
import type { VitalsRepository } from "../repositories/VitalsRepository";
import type { AdminAuthenticator } from "../security/AdminAuthenticator";
import type { ClientProfileService } from "../services/ClientProfileService";

const MS_PER_DAY = 86_400_000;

export interface SummarizeVitalsDependencies {
  readonly clientProfiles: ClientProfileService;
  readonly vitalsConfig: VitalsConfig;
}

function clampedInteger(raw: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Math.min(Number.isNaN(parsed) || parsed < 1 ? fallback : parsed, max);
}

/** `GET /api/vitals?days=7&limit=500` (owner only): PageSpeed-style field data — percentile and good / needs-improvement / poor shares. */
export class SummarizeVitalsAction {
  constructor(private readonly dependencies: SummarizeVitalsDependencies) {}

  async execute(
    request: Request,
    logger: Logger,
    authenticator: AdminAuthenticator,
    resolveRepository: () => Promise<VitalsRepository>,
  ): Promise<Response> {
    const { clientProfiles, vitalsConfig } = this.dependencies;
    const meta = describeRequestMeta(request, clientProfiles);
    const vitalsLogger = logger.forActor("SummarizeVitalsAction");
    const refused = await authenticator.refuse(request, meta.ip, vitalsLogger);
    if (refused) return refused;

    const repository = await resolveRepository();
    if (!repository.isConfigured) return jsonResponse({ samples: 0, note: "vitals_db_not_configured" }, HttpStatus.Ok);
    const { summary } = vitalsConfig;
    const query = new URL(request.url).searchParams;
    const days = clampedInteger(query.get("days"), summary.defaultDays, summary.maxDays);
    const limit = clampedInteger(query.get("limit"), summary.defaultLimit, summary.maxLimit);
    const since = new Date(Date.now() - days * MS_PER_DAY).toISOString();
    const rows = await repository.recent(since, limit);
    logApiAccess(vitalsLogger, { status: HttpStatus.Ok, outcome: "summary", count: rows.length, ...meta });
    return jsonResponse({ days, ...summarizeVitals(rows, vitalsConfig) }, HttpStatus.Ok);
  }
}
