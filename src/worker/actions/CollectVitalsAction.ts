import { EnvVar } from "../../enums/EnvVar";
import { HttpStatus } from "../../enums/HttpStatus";
import type { SecurityConfig } from "../../types/SecurityConfig";
import type { StoredVitals, VitalsConfig, VitalsPayload } from "../../types/WebVitals";
import { describeRequestMeta, logApiAccess } from "../http/apiAccessLog";
import { jsonResponse } from "../http/jsonResponse";
import { readBoundedText } from "../http/readBoundedText";
import type { Logger } from "../logging/Logger";
import type { VitalsRepository } from "../repositories/VitalsRepository";
import { isSameOriginRequest } from "../security/originGuard";
import { createRateLimiter } from "../security/rateLimiter";
import { parseVitalsPayload } from "../security/vitalsPayload";
import { readEnvironmentFlag } from "../services/FeatureFlags";
import type { ClientProfileService } from "../services/ClientProfileService";
import type { WorkerEnvironment } from "../types/WorkerEnvironment";

export interface CollectVitalsDependencies {
  readonly clientProfiles: ClientProfileService;
  readonly vitalsConfig: VitalsConfig;
  /** Isolate-local counters, used when neither the rate-limit binding nor KV is available. */
  readonly memoryCounters: Map<string, number>;
}

function noContent(): Response {
  return new Response(null, { status: HttpStatus.NoContent, headers: { "Cache-Control": "no-store" } });
}

/**
 * `POST /api/vitals`: the page's `sendBeacon` lands here. It is deliberately quiet: anything unusable (feature off, bot,
 * cross-origin, over the rate limit, malformed) is answered 204 with nothing stored, so the endpoint reveals nothing and
 * a failing store never shows in the visitor's console. Only the method (405) and body size (413) get an error status.
 */
export class CollectVitalsAction {
  constructor(private readonly dependencies: CollectVitalsDependencies) {}

  async execute(
    request: Request,
    environment: WorkerEnvironment,
    logger: Logger,
    config: SecurityConfig,
    resolveRepository: () => Promise<VitalsRepository>,
  ): Promise<Response> {
    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, HttpStatus.MethodNotAllowed, { Allow: "POST" });
    }
    const { clientProfiles, vitalsConfig, memoryCounters } = this.dependencies;
    const profile = clientProfiles.profile(request);
    if (!this.isAccepting(request, environment, profile.bot.isBot)) return noContent();

    const meta = describeRequestMeta(request, clientProfiles);
    const vitalsLogger = logger.forActor("CollectVitalsAction");
    const decision = await createRateLimiter(environment, memoryCounters).consume(
      "vitals",
      meta.ip,
      config.rateLimits.vitals,
    );
    if (!decision.allowed) return noContent();

    const rawBody = await readBoundedText(request, config.limits.maxVitalsBodyBytes);
    if (rawBody === undefined) return jsonResponse({ error: "payload_too_large" }, HttpStatus.PayloadTooLarge);

    let payload: VitalsPayload | undefined;
    try {
      payload = parseVitalsPayload(JSON.parse(rawBody), vitalsConfig);
    } catch {
      return noContent();
    }
    if (!payload) return noContent();

    const row = this.toStored(payload, profile);
    const stored = await (await resolveRepository()).save(row);
    // Without a database the measurement still reaches `wrangler tail` / the log channels, so the feature is observable
    // before D1 is bound.
    if (!stored) {
      vitalsLogger.info({
        event: "web_vitals",
        location: payload.page,
        reason: "no vitals database bound",
        context: { ...row },
      });
    }
    logApiAccess(vitalsLogger, { status: HttpStatus.NoContent, outcome: stored ? "stored" : "logged", ...meta });
    return noContent();
  }

  /** Feature on, same-origin and not a bot. */
  private isAccepting(request: Request, environment: WorkerEnvironment, isBot: boolean): boolean {
    const enabled = environment[EnvVar.RumEnabled];
    return (
      readEnvironmentFlag(typeof enabled === "string" ? enabled : undefined) === true &&
      isSameOriginRequest(request) &&
      !isBot
    );
  }

  /** Browser measurements + the edge's view of the client (no IP, no user id). */
  private toStored(payload: VitalsPayload, profile: ReturnType<ClientProfileService["profile"]>): StoredVitals {
    const { device } = payload;
    return {
      timestamp: new Date().toISOString(),
      page: payload.page,
      navigationType: payload.navigationType,
      country: profile.network.country,
      deviceType: profile.device.type,
      deviceVendor: profile.device.vendor,
      deviceModel: device.model || profile.device.model,
      browser: profile.browser.name,
      browserVersion: profile.browser.version,
      os: device.platform || profile.os.name,
      osVersion: device.platformVersion || profile.os.version,
      effectiveConnection: device.effectiveConnection,
      saveData: device.saveData,
      viewportWidth: device.viewportWidth,
      viewportHeight: device.viewportHeight,
      devicePixelRatio: device.devicePixelRatio,
      memoryGb: device.memoryGb,
      cores: device.cores,
      metrics: payload.metrics,
      attribution: payload.attribution,
      sections: payload.sections,
    };
  }
}
