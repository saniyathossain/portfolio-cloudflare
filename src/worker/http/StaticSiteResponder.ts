import { EnvVar } from "../../enums/EnvVar";
import { HttpStatus } from "../../enums/HttpStatus";
import type { Logger } from "../logging/Logger";
import { ACCEPT_CLIENT_HINTS, buildSecurityHeaders } from "../security/headers";
import { readEnvironmentFlag, resolveFlag } from "../services/FeatureFlags";
import type { WorkerEnvironment } from "../types/WorkerEnvironment";
import { withNoTransform } from "./cacheControl";
import { EARLY_HINTS } from "./earlyHints";
import { errorPageResponse } from "./errorPage";

const SERVER_ERROR_FLOOR: number = HttpStatus.InternalServerError;
const PORTFOLIO_JSON_PATH = "/assets/data/portfolio.json";
const ONE_YEAR_IMMUTABLE = "public, max-age=31536000, immutable";
const ONE_HOUR = "public, max-age=3600";
const ALWAYS_REVALIDATE = "public, max-age=0, must-revalidate";

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return typeof value === "object" && value !== null ? (value as JsonObject) : {};
}

function isHtmlResponse(requestUrl: string, response: Response): boolean {
  const { pathname } = new URL(requestUrl);
  if (pathname === "/" || pathname.endsWith(".html")) return true;
  return (response.headers.get("content-type") ?? "").includes("text/html");
}

function cacheControlFor(pathname: string): string | undefined {
  if (pathname.startsWith("/assets/data/") && pathname.endsWith(".json")) return ONE_HOUR;
  if (pathname.startsWith("/assets/")) return ONE_YEAR_IMMUTABLE;
  if (pathname === "/" || pathname.endsWith(".html")) return ALWAYS_REVALIDATE;
  return undefined;
}

export interface StaticResponseOptions {
  /** True for the `?preview=<ADMIN_TOKEN>` maintenance bypass: the response must never be cached or shared. */
  readonly isPreview: boolean;
}

/** Serves the built site from the ASSETS binding and layers on security headers, cache policy and preload hints. */
export class StaticSiteResponder {
  async respond(
    request: Request,
    environment: WorkerEnvironment,
    logger: Logger,
    options: StaticResponseOptions,
  ): Promise<Response> {
    const url = new URL(request.url);
    const response = await environment.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(buildSecurityHeaders(request.url))) headers.set(name, value);

    if (url.pathname === PORTFOLIO_JSON_PATH && response.ok) return this.portfolioJson(response, environment, headers);

    const cacheControl = cacheControlFor(url.pathname);
    if (cacheControl) headers.set("Cache-Control", cacheControl);
    if (options.isPreview) headers.set("Cache-Control", "no-store");

    const isHtml = isHtmlResponse(request.url, response);
    if (isHtml) this.applyHtmlHeaders(headers, environment);
    if (isHtml && response.status >= SERVER_ERROR_FLOOR) {
      logger.error({
        event: "upstream_failed",
        location: url.pathname,
        reason: `asset store answered ${response.status}`,
      });
      return errorPageResponse(
        { assets: environment.ASSETS, logger, baseHeaders: buildSecurityHeaders(request.url) },
        { requestUrl: request.url, slug: "bad-gateway", status: HttpStatus.BadGateway },
      );
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  /** Preload hints, client-hint opt-in and — unless ALLOW_EDGE_INJECTION is on — `no-transform`, which keeps Cloudflare from
   *  injecting its 10 KB third-party Web Analytics beacon into the page. */
  private applyHtmlHeaders(headers: Headers, environment: WorkerEnvironment): void {
    headers.set("Link", EARLY_HINTS);
    headers.set("Accept-CH", ACCEPT_CLIENT_HINTS);
    const allowed = environment[EnvVar.AllowEdgeInjection];
    if (readEnvironmentFlag(typeof allowed === "string" ? allowed : undefined) !== true) {
      headers.set("Cache-Control", withNoTransform(headers.get("Cache-Control")));
    }
  }

  /** The Worker var SKILLS_SCROLL_DESIGN overrides the JSON default, so the flag is resolved per request, uncached. */
  private async portfolioJson(response: Response, environment: WorkerEnvironment, headers: Headers): Promise<Response> {
    const raw = asObject(await response.json());
    const site = asObject(raw["site"]);
    const features = asObject(site["features"]);
    const flags = asObject(features["flags"]);
    flags["skillsScrollDesign"] = resolveFlag(
      flags["skillsScrollDesign"] as boolean | undefined,
      environment.SKILLS_SCROLL_DESIGN,
    );
    features["flags"] = flags;
    site["features"] = features;
    raw["site"] = site;
    headers.set("Cache-Control", "no-store");
    return new Response(JSON.stringify(raw), { status: response.status, statusText: response.statusText, headers });
  }
}
