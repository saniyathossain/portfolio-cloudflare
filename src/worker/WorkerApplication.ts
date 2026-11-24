import type { SecuritySeverity as SecuritySeverityType } from "../enums/SecuritySeverity";
import { SecuritySeverity } from "../enums/SecuritySeverity";
import { timingSafeEqual } from "../lib/timingSafeEqual";
import type { SecurityServices } from "./bootstrap/container";
import type { ContactController } from "./controllers/ContactController";
import type { CspReportController } from "./controllers/CspReportController";
import { errorPageResponse } from "./http/errorPage";
import type { StaticSiteResponder } from "./http/StaticSiteResponder";
import type { Logger } from "./logging/Logger";
import { buildSecurityHeaders, CSP_REPORT_PATH } from "./security/headers";
import type { GuardVerdict } from "./security/requestGuard";
import { logSecurityEvent } from "./security/securityEvents";
import { isMaintenanceOn } from "./services/FeatureFlags";
import type { WorkerEnvironment } from "./types/WorkerEnvironment";

const CONTACT_PATH = "/api/contact";
const HTTP_NO_CONTENT = 204;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_SERVICE_UNAVAILABLE = 503;
const HTTP_INTERNAL_ERROR = 500;
const MAINTENANCE_RETRY_AFTER_SECONDS = "3600";

export interface WorkerApplicationDependencies {
  readonly security: SecurityServices;
  readonly contact: ContactController;
  readonly cspReports: CspReportController;
  readonly staticSite: StaticSiteResponder;
}

type RejectedVerdict = Extract<GuardVerdict, { allowed: false }>;

/**
 * The request pipeline, in order: request guard → CORS preflight → maintenance gate → API routes → static site.
 * Each layer is its own collaborator; this class only decides the order and turns uncaught failures into the
 * shell-console 500 page (the visitor sees only the reference id; the exception goes to the log).
 */
export class WorkerApplication {
  constructor(private readonly dependencies: WorkerApplicationDependencies) {}

  async handle(request: Request, environment: WorkerEnvironment, logger: Logger): Promise<Response> {
    try {
      return await this.route(request, environment, logger);
    } catch (error) {
      logger.exception(
        { event: "unhandled_exception", location: `${request.method} ${new URL(request.url).pathname}`, reason: "request handler threw" },
        error,
      );
      return this.errorPage(request, environment, logger, "server-error", HTTP_INTERNAL_ERROR);
    }
  }

  private async route(request: Request, environment: WorkerEnvironment, logger: Logger): Promise<Response> {
    const { security, contact, cspReports, staticSite } = this.dependencies;
    const url = new URL(request.url);

    const verdict = security.guard.inspect(request);
    if (!verdict.allowed) return this.rejected(request, logger, verdict);

    // Same-origin only, so a CORS preflight is never legitimate: answer it without touching assets.
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: HTTP_NO_CONTENT,
        headers: { ...buildSecurityHeaders(request.url), Allow: security.config.allowedMethods.join(", ") },
      });
    }

    // Maintenance mode is a hard site-wide 503; the owner bypasses it with ?preview=<ADMIN_TOKEN>.
    let isPreview = false;
    if (isMaintenanceOn(environment)) {
      const adminToken = environment.ADMIN_TOKEN;
      isPreview = Boolean(adminToken) && timingSafeEqual(url.searchParams.get("preview") ?? "", adminToken ?? "");
      if (!isPreview) return this.maintenance(request, environment, logger);
    }

    if (url.pathname === CSP_REPORT_PATH) return cspReports.handle(request, environment, logger);
    if (url.pathname === CONTACT_PATH) return contact.handle(request, environment, logger);
    return staticSite.respond(request, environment, logger, { isPreview });
  }

  /** Bare status for the visitor; the reason goes to the security log. */
  private rejected(request: Request, logger: Logger, verdict: RejectedVerdict): Response {
    const severity: SecuritySeverityType = verdict.event === "scanner_probe" ? SecuritySeverity.Low : SecuritySeverity.Medium;
    logSecurityEvent(logger.forActor("RequestGuard"), request, { event: verdict.event, severity, reason: verdict.reason });
    const headers: Record<string, string> = {
      ...buildSecurityHeaders(request.url),
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    };
    if (verdict.status === HTTP_METHOD_NOT_ALLOWED) headers["Allow"] = this.dependencies.security.config.allowedMethods.join(", ");
    return new Response(request.method === "HEAD" ? null : "Not available", { status: verdict.status, headers });
  }

  private maintenance(request: Request, environment: WorkerEnvironment, logger: Logger): Promise<Response> {
    logger.warn({ event: "maintenance_served", location: new URL(request.url).pathname, reason: "MAINTENANCE_MODE is on" });
    return this.errorPage(request, environment, logger, "maintenance", HTTP_SERVICE_UNAVAILABLE, {
      overrides: { title: environment.MAINTENANCE_TITLE, message: environment.MAINTENANCE_MESSAGE },
      extraHeaders: { "Retry-After": MAINTENANCE_RETRY_AFTER_SECONDS },
    });
  }

  private errorPage(
    request: Request,
    environment: WorkerEnvironment,
    logger: Logger,
    slug: string,
    status: number,
    options: { overrides?: { title?: string | undefined; message?: string | undefined }; extraHeaders?: Record<string, string> } = {},
  ): Promise<Response> {
    return errorPageResponse(
      { assets: environment.ASSETS, logger, baseHeaders: buildSecurityHeaders(request.url) },
      { requestUrl: request.url, slug, status, ...options },
    );
  }
}
