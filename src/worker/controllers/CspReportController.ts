import { SecuritySeverity } from "../../enums/SecuritySeverity";
import type { SecurityConfig } from "../../types/SecurityConfig";
import { describeRequestMeta } from "../http/apiAccessLog";
import { jsonResponse } from "../http/jsonResponse";
import { readBoundedText } from "../http/readBoundedText";
import type { Logger } from "../logging/Logger";
import { createRateLimiter } from "../security/rateLimiter";
import { logSecurityEvent } from "../security/securityEvents";
import type { ClientProfileService } from "../services/ClientProfileService";
import type { WorkerEnvironment } from "../types/WorkerEnvironment";

const HTTP_NO_CONTENT = 204;
const HTTP_METHOD_NOT_ALLOWED = 405;
const MAX_FIELD_LENGTH = 200;
const MAX_DIRECTIVE_LENGTH = 120;

type ReportFields = Readonly<Record<string, unknown>>;

function asFields(value: unknown): ReportFields {
  return typeof value === "object" && value !== null ? (value as ReportFields) : {};
}

function text(fields: ReportFields, ...keys: string[]): string {
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === "string" && value !== "") return value;
  }
  return "";
}

/**
 * CSP violation sink (`report-uri`). A burst of violations from one page usually means injected script — an XSS
 * attempt or a compromised dependency — so each is logged with the blocked URI and directive. Capped in size and
 * rate, answered 204, never stored in full.
 */
export class CspReportController {
  constructor(
    private readonly config: SecurityConfig,
    private readonly clientProfiles: ClientProfileService,
    private readonly memoryCounters: Map<string, number>,
  ) {}

  async handle(request: Request, environment: WorkerEnvironment, logger: Logger): Promise<Response> {
    if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, HTTP_METHOD_NOT_ALLOWED, { Allow: "POST" });

    const reportLogger = logger.forActor("CspReportController");
    const meta = describeRequestMeta(request, this.clientProfiles);
    const decision = await createRateLimiter(environment, this.memoryCounters).consume("csp-report", meta.ip, this.config.rateLimits.cspReport);
    if (!decision.allowed) return new Response(null, { status: HTTP_NO_CONTENT });

    const rawBody = await readBoundedText(request, this.config.limits.maxCspReportBytes);
    if (rawBody === undefined) return new Response(null, { status: HTTP_NO_CONTENT });

    let report: ReportFields;
    try {
      const parsed = asFields(JSON.parse(rawBody));
      report = asFields(parsed["csp-report"] ?? parsed);
    } catch {
      return new Response(null, { status: HTTP_NO_CONTENT });
    }

    logSecurityEvent(reportLogger, request, {
      event: "csp_violation",
      severity: SecuritySeverity.Medium,
      reason: (text(report, "violated-directive", "effectiveDirective") || "unknown directive").slice(0, MAX_DIRECTIVE_LENGTH),
      detail: {
        blockedUri: text(report, "blocked-uri", "blockedURL").slice(0, MAX_FIELD_LENGTH),
        documentUri: text(report, "document-uri", "documentURL").slice(0, MAX_FIELD_LENGTH),
        sourceFile: text(report, "source-file", "sourceFile").slice(0, MAX_FIELD_LENGTH),
      },
    });
    return new Response(null, { status: HTTP_NO_CONTENT, headers: { "Cache-Control": "no-store" } });
  }
}
