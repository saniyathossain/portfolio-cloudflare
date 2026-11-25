import { EnvVar } from "../enums/EnvVar";
import { HttpStatus } from "../enums/HttpStatus";
import type { SecuritySeverity as SecuritySeverityType } from "../enums/SecuritySeverity";
import { SecuritySeverity } from "../enums/SecuritySeverity";
import type { SecurityConfig } from "../types/SecurityConfig";
import { timingSafeEqual } from "./support/timingSafeEqual";
import type { SecurityServices } from "./bootstrap/container";
import type { ContactController } from "./controllers/ContactController";
import type { CspReportController } from "./controllers/CspReportController";
import type { VitalsController } from "./controllers/VitalsController";
import { errorPageResponse } from "./http/errorPage";
import type { StaticSiteResponder } from "./http/StaticSiteResponder";
import type { Logger } from "./logging/Logger";
import { buildSecurityHeaders, CSP_REPORT_PATH } from "./security/headers";
import type { GuardVerdict } from "./security/requestGuard";
import { logSecurityEvent } from "./security/securityEvents";
import { isMaintenanceOn } from "./services/FeatureFlags";
import type { WorkerEnvironment } from "./types/WorkerEnvironment";

const CONTACT_PATH = "/api/contact";
const VITALS_PATH = "/api/vitals";

export interface WorkerApplicationDependencies {
  readonly security: SecurityServices;
  readonly contact: ContactController;
  readonly cspReports: CspReportController;
  readonly vitals: VitalsController;
  readonly staticSite: StaticSiteResponder;
}

type RejectedVerdict = Extract<GuardVerdict, { allowed: false }>;

/**
 * The request pipeline, in order: request guard → CORS preflight → maintenance gate → API routes → static site.
 * Each layer is its own collaborator; this class only decides the order and turns uncaught failures into the
 * shell-console 500 page (the visitor sees only the reference id; the exception goes to the log).
 */
export class WorkerApplication {
  /** Environments whose invalid variables were already reported (once per isolate, not once per request). */
  private readonly reportedEnvironments = new WeakSet<object>();

  constructor(private readonly dependencies: WorkerApplicationDependencies) {}

  async handle(request: Request, environment: WorkerEnvironment, logger: Logger): Promise<Response> {
    try {
      return await this.route(request, environment, logger);
    } catch (error) {
      logger.exception(
        {
          event: "unhandled_exception",
          location: `${request.method} ${new URL(request.url).pathname}`,
          reason: "request handler threw",
        },
        error,
      );
      return this.errorPage(request, environment, logger, "server-error", HttpStatus.InternalServerError);
    }
  }

  private async route(request: Request, environment: WorkerEnvironment, logger: Logger): Promise<Response> {
    const { security, contact, cspReports, vitals, staticSite } = this.dependencies;
    const url = new URL(request.url);

    const { config, issues } = security.configResolver.resolve(environment);
    this.reportConfigIssues(environment, logger, issues);

    const verdict = security.guardFor(config).inspect(request);
    if (!verdict.allowed) return this.rejected(request, logger, verdict, config);

    // Same-origin only, so a CORS preflight is never legitimate: answer it without touching assets.
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: HttpStatus.NoContent,
        headers: { ...buildSecurityHeaders(request.url), Allow: config.allowedMethods.join(", ") },
      });
    }

    // Maintenance mode is a hard site-wide 503; the owner bypasses it with ?preview=<ADMIN_TOKEN>.
    let isPreview = false;
    if (isMaintenanceOn(environment)) {
      const adminToken = environment[EnvVar.AdminToken];
      isPreview =
        typeof adminToken === "string" &&
        adminToken !== "" &&
        timingSafeEqual(url.searchParams.get("preview") ?? "", adminToken);
      if (!isPreview) return this.maintenance(request, environment, logger, config);
    }

    const endpoint = { [CSP_REPORT_PATH]: cspReports, [CONTACT_PATH]: contact, [VITALS_PATH]: vitals }[url.pathname];
    if (endpoint) return endpoint.handle(request, environment, logger, config);
    return staticSite.respond(request, environment, logger, { isPreview });
  }

  /** Bare status for the visitor; the reason goes to the security log. */
  private rejected(request: Request, logger: Logger, verdict: RejectedVerdict, config: SecurityConfig): Response {
    const severity: SecuritySeverityType =
      verdict.event === "scanner_probe" ? SecuritySeverity.Low : SecuritySeverity.Medium;
    logSecurityEvent(logger.forActor("RequestGuard"), request, {
      event: verdict.event,
      severity,
      reason: verdict.reason,
    });
    const headers: Record<string, string> = {
      ...buildSecurityHeaders(request.url),
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    };
    if (verdict.status === HttpStatus.MethodNotAllowed) headers["Allow"] = config.allowedMethods.join(", ");
    return new Response(request.method === "HEAD" ? null : "Not available", { status: verdict.status, headers });
  }

  private maintenance(
    request: Request,
    environment: WorkerEnvironment,
    logger: Logger,
    config: SecurityConfig,
  ): Promise<Response> {
    logger.warn({
      event: "maintenance_served",
      location: new URL(request.url).pathname,
      reason: "MAINTENANCE_MODE is on",
    });
    return this.errorPage(request, environment, logger, "maintenance", HttpStatus.ServiceUnavailable, {
      overrides: { title: environment.MAINTENANCE_TITLE, message: environment.MAINTENANCE_MESSAGE },
      extraHeaders: { "Retry-After": String(config.maintenanceRetryAfterSeconds) },
    });
  }

  /** Ignored variables are a deploy mistake worth one warning, never a reason to fail requests. */
  private reportConfigIssues(environment: WorkerEnvironment, logger: Logger, issues: readonly string[]): void {
    if (issues.length === 0 || this.reportedEnvironments.has(environment)) return;
    this.reportedEnvironments.add(environment);
    for (const issue of issues) {
      logger.warn({
        event: "invalid_env_config",
        location: "EnvironmentConfigResolver",
        reason: `${issue}; the security.json default is used`,
      });
    }
  }

  private errorPage(
    request: Request,
    environment: WorkerEnvironment,
    logger: Logger,
    slug: string,
    status: number,
    options: {
      overrides?: { title?: string | undefined; message?: string | undefined };
      extraHeaders?: Record<string, string>;
    } = {},
  ): Promise<Response> {
    return errorPageResponse(
      { assets: environment.ASSETS, logger, baseHeaders: buildSecurityHeaders(request.url) },
      { requestUrl: request.url, slug, status, ...options },
    );
  }
}
