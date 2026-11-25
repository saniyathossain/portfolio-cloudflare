import { ApiErrorCode } from "../../enums/ApiErrorCode";
import { EnvVar } from "../../enums/EnvVar";
import { HttpStatus } from "../../enums/HttpStatus";
import { SecuritySeverity } from "../../enums/SecuritySeverity";
import type { SecurityConfig } from "../../types/SecurityConfig";
import type { StoredContactSubmission } from "../../types/StoredContactSubmission";
import { describeRequestMeta, logApiAccess, type RequestMeta } from "../http/apiAccessLog";
import { jsonResponse } from "../http/jsonResponse";
import { readBoundedText } from "../http/readBoundedText";
import type { Logger } from "../logging/Logger";
import type { ContactSubmissionRepository } from "../repositories/ContactSubmissionRepository";
import { parseContactPayload, type ContactSubmission } from "../security/contactPayload";
import { isSameOriginRequest } from "../security/originGuard";
import { createRateLimiter, type RateDecision, type RateLimiter } from "../security/rateLimiter";
import { logSecurityEvent } from "../security/securityEvents";
import type { ClientProfileService } from "../services/ClientProfileService";
import type { ContactNotifier } from "../services/ContactNotifier";
import type { TurnstileVerifier } from "../services/TurnstileVerifier";
import type { WorkerEnvironment } from "../types/WorkerEnvironment";

type ApiBody = { error?: string } & Record<string, unknown>;

/** Per-request state shared by the submission steps: logger, client meta, rate limiter and the one `finish` exit. */
interface Exchange {
  readonly request: Request;
  readonly environment: WorkerEnvironment;
  readonly config: SecurityConfig;
  readonly logger: Logger;
  readonly meta: RequestMeta;
  readonly limiter: RateLimiter;
  finish(status: HttpStatus, body: ApiBody, extra?: Record<string, unknown>, headers?: Record<string, string>): Response;
}

type Step<TValue extends object> = { response: Response } & { [K in keyof TValue]?: never } | ({ response?: never } & TValue);

export interface SubmitContactDependencies {
  readonly clientProfiles: ClientProfileService;
  readonly turnstile: TurnstileVerifier;
  /** Isolate-local counters, used when neither the rate-limit binding nor KV is available. */
  readonly memoryCounters: Map<string, number>;
  /** Built per request because both depend on the environment and the request logger. */
  readonly createRepository: (environment: WorkerEnvironment, config: SecurityConfig, logger: Logger) => ContactSubmissionRepository;
  readonly createNotifier: (environment: WorkerEnvironment, logger: Logger) => ContactNotifier;
}

/**
 * `POST /api/contact`: refuse cheap-to-detect bad requests first, then read and validate the body, screen it
 * (rate limit, honeypot, CAPTCHA), store it and notify. Every exit logs one structured line and answers a short
 * machine-readable code; details stay in the log.
 */
export class SubmitContactAction {
  constructor(private readonly dependencies: SubmitContactDependencies) {}

  async execute(request: Request, environment: WorkerEnvironment, logger: Logger, config: SecurityConfig): Promise<Response> {
    const context = this.openExchange(request, environment, logger, config);

    const refused = this.refuseBadRequest(context) ?? (await this.refuseOverLimit(context));
    if (refused) return refused;

    const read = await this.readSubmission(context);
    if (read.response) return read.response;
    const { submission } = read;

    const screened = await this.screen(context, submission);
    if (screened.response) return screened.response;

    const record: StoredContactSubmission = {
      name: submission.name,
      email: submission.email,
      project: submission.project,
      ts: new Date().toISOString(),
      ip: context.meta.ip,
      country: context.meta.country,
      asn: context.meta.asn,
      ua: context.meta.ua,
      ray: context.meta.ray,
    };
    const kvStored = await this.dependencies.createRepository(environment, config, context.logger).save(record);
    const emailed = await this.dependencies.createNotifier(environment, context.logger).notify(submission);
    return context.finish(HttpStatus.Ok, { ok: true, emailed }, {
      name: submission.name,
      email: submission.email,
      turnstile: screened.turnstile,
      turnstile_configured: Boolean(environment[EnvVar.TurnstileSecret]),
      kvStored,
      emailed,
    });
  }

  private openExchange(request: Request, environment: WorkerEnvironment, logger: Logger, config: SecurityConfig): Exchange {
    const startedAt = Date.now();
    const { clientProfiles, memoryCounters } = this.dependencies;
    const contactLogger = logger.forActor("SubmitContactAction");
    const meta = describeRequestMeta(request, clientProfiles);
    return {
      request,
      environment,
      config,
      logger: contactLogger,
      meta,
      limiter: createRateLimiter(environment, memoryCounters),
      finish: (status, body, extra = {}, headers = {}) => {
        logApiAccess(contactLogger, { status, ms: Date.now() - startedAt, outcome: body.error ?? "ok", ...meta, ...extra });
        return jsonResponse(body, status, headers);
      },
    };
  }

  /** Method, content type and same-origin checks — all cheap, none need the body. */
  private refuseBadRequest(context: Exchange): Response | undefined {
    const { request, logger } = context;
    if (request.method !== "POST") {
      return context.finish(HttpStatus.MethodNotAllowed, { error: ApiErrorCode.MethodNotAllowed }, {}, { Allow: "POST" });
    }
    if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
      return context.finish(HttpStatus.UnsupportedMediaType, { error: ApiErrorCode.BadContentType });
    }
    if (isSameOriginRequest(request)) return undefined;
    logSecurityEvent(logger, request, {
      event: "cross_origin_post_blocked",
      severity: SecuritySeverity.High,
      reason: "Origin / Sec-Fetch-Site says the POST came from another site",
    });
    return context.finish(HttpStatus.Forbidden, { error: ApiErrorCode.ForbiddenOrigin });
  }

  /** A client that already used its allowance is turned away before any body is read. */
  private async refuseOverLimit(context: Exchange): Promise<Response | undefined> {
    const decision = await context.limiter.peek("contact", context.meta.ip, context.config.rateLimits.contact);
    return decision.allowed ? undefined : this.rateLimited(context, decision);
  }

  private rateLimited(context: Exchange, decision: RateDecision): Response {
    const { limit, windowSeconds } = context.config.rateLimits.contact;
    logSecurityEvent(context.logger, context.request, {
      event: "rate_limit_exceeded",
      severity: SecuritySeverity.Medium,
      reason: `more than ${limit} submissions per ${windowSeconds}s`,
      detail: { scope: "contact" },
    });
    return context.finish(HttpStatus.TooManyRequests, { error: ApiErrorCode.RateLimited }, {}, {
      "Retry-After": String(decision.retryAfterSeconds),
    });
  }

  /** Bounded body → JSON → validated submission, or the response that rejects it. */
  private async readSubmission(context: Exchange): Promise<Step<{ submission: ContactSubmission }>> {
    const { config } = context;
    const rawBody = await readBoundedText(context.request, config.limits.maxContactBodyBytes);
    if (rawBody === undefined) {
      logSecurityEvent(context.logger, context.request, {
        event: "oversized_body_blocked",
        severity: SecuritySeverity.Medium,
        reason: `body larger than ${config.limits.maxContactBodyBytes} bytes`,
      });
      return { response: context.finish(HttpStatus.PayloadTooLarge, { error: ApiErrorCode.PayloadTooLarge }) };
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return { response: context.finish(HttpStatus.BadRequest, { error: ApiErrorCode.BadJson }) };
    }

    const parsed = parseContactPayload(body, config);
    const { submission } = parsed;
    if (!submission) {
      return { response: context.finish(HttpStatus.BadRequest, { error: parsed.valid ? ApiErrorCode.BadPayload : parsed.error }) };
    }

    // Honeypot: a hidden field no human fills. Answer like a success so the bot learns nothing; store nothing.
    if (submission.honeypot !== "") return { response: await this.trapBot(context, submission) };
    if (!parsed.valid) {
      return { response: context.finish(HttpStatus.Unprocessable, { error: parsed.error }, { name: submission.name, email: submission.email }) };
    }
    return { submission };
  }

  private async trapBot(context: Exchange, submission: ContactSubmission): Promise<Response> {
    const { config } = context;
    await context.limiter.consume("contact", context.meta.ip, config.rateLimits.contact);
    logSecurityEvent(context.logger, context.request, {
      event: "honeypot_triggered",
      severity: SecuritySeverity.Medium,
      reason: "hidden form field was filled in",
      detail: { field: config.honeypotField },
    });
    return context.finish(HttpStatus.Ok, { ok: true, emailed: false }, { name: submission.name, email: submission.email, outcome: "honeypot" });
  }

  /**
   * Counts the validated submission against the limit, then runs the CAPTCHA once a Turnstile secret is configured
   * (so the form works before setup). `turnstile_configured` is logged on every accepted submission so an unset
   * secret — CAPTCHA silently off — is visible in the logs instead of a gap nobody notices until it is abused.
   */
  private async screen(context: Exchange, submission: ContactSubmission): Promise<Step<{ turnstile: string }>> {
    const decision = await context.limiter.consume("contact", context.meta.ip, context.config.rateLimits.contact);
    if (!decision.allowed) return { response: this.rateLimited(context, decision) };

    const secret = context.environment[EnvVar.TurnstileSecret];
    if (typeof secret !== "string" || secret === "") return { turnstile: "skipped" };
    if (await this.dependencies.turnstile.verify(secret, submission.token, context.meta.ip, context.logger)) return { turnstile: "passed" };

    logSecurityEvent(context.logger, context.request, {
      event: "captcha_failed",
      severity: SecuritySeverity.Medium,
      reason: "Turnstile rejected the token (bot, expired or missing)",
    });
    const extra = { name: submission.name, email: submission.email, turnstile: "failed", turnstile_configured: true };
    return { response: context.finish(HttpStatus.Forbidden, { error: ApiErrorCode.CaptchaFailed }, extra) };
  }
}
