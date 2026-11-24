import { EmailMessage } from "cloudflare:email";
import { SecuritySeverity } from "../../enums/SecuritySeverity";
import { timingSafeEqual } from "../../lib/timingSafeEqual";
import type { SecurityConfig } from "../../types/SecurityConfig";
import { describeRequestMeta, logApiAccess, type RequestMeta } from "../http/apiAccessLog";
import { jsonResponse } from "../http/jsonResponse";
import { readBoundedText } from "../http/readBoundedText";
import type { Logger } from "../logging/Logger";
import { parseContactPayload, type ContactSubmission } from "../security/contactPayload";
import { isSameOriginRequest } from "../security/originGuard";
import { createRateLimiter, type RateDecision, type RateLimiter } from "../security/rateLimiter";
import { logSecurityEvent } from "../security/securityEvents";
import { composeContactMail } from "../services/ContactMailComposer";
import type { ClientProfileService } from "../services/ClientProfileService";
import type { TurnstileVerifier } from "../services/TurnstileVerifier";
import type { KvNamespace, WorkerEnvironment } from "../types/WorkerEnvironment";

interface Exchange {
  readonly request: Request;
  readonly environment: WorkerEnvironment;
  readonly logger: Logger;
  readonly meta: RequestMeta;
  readonly limiter: RateLimiter;
  finish(status: number, body: { error?: string } & Record<string, unknown>, extra?: Record<string, unknown>, headers?: Record<string, string>): Response;
}

const CONTACT_PATH = "/api/contact";
const CONTACT_RETENTION_SECONDS = 60 * 60 * 24 * 365;
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;
const HTTP = {
  ok: 200,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  methodNotAllowed: 405,
  payloadTooLarge: 413,
  unsupportedMediaType: 415,
  unprocessable: 422,
  tooManyRequests: 429,
} as const;

export interface ContactControllerDependencies {
  readonly config: SecurityConfig;
  readonly clientProfiles: ClientProfileService;
  readonly turnstile: TurnstileVerifier;
  /** Isolate-local counters, used when neither the rate-limit binding nor KV is available. */
  readonly memoryCounters: Map<string, number>;
}

interface StoredSubmission {
  readonly name: string;
  readonly email: string;
  readonly project: string;
  readonly ts: string;
  readonly ip: string;
  readonly country: string;
  readonly asn: number | undefined;
  readonly ua: string;
  readonly ray: string;
}

/**
 * The contact API (`POST /api/contact`) and the owner-only read (`GET /api/contact`). Every exit logs one
 * structured line and answers a short machine-readable code — details stay in the log, never in the response.
 */
export class ContactController {
  constructor(private readonly dependencies: ContactControllerDependencies) {}

  /** Entry point for `/api/contact`: GET reads, everything else is treated as a submission. */
  handle(request: Request, environment: WorkerEnvironment, logger: Logger): Promise<Response> {
    return request.method === "GET" ? this.list(request, environment, logger) : this.submit(request, environment, logger);
  }

  async submit(request: Request, environment: WorkerEnvironment, logger: Logger): Promise<Response> {
    const context = this.openExchange(request, environment, logger);

    const refused = this.refuseBadRequest(context) ?? (await this.refuseOverLimit(context));
    if (refused) return refused;

    const read = await this.readSubmission(context);
    if (read.response) return read.response;
    const { submission } = read;

    const screened = await this.screen(context, submission);
    if (screened.response) return screened.response;

    const record: StoredSubmission = {
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
    const kvStored = await this.persist(record, environment, context.logger);
    const emailed = await this.notify(submission, environment, context.logger);
    return context.finish(HTTP.ok, { ok: true, emailed }, {
      name: submission.name,
      email: submission.email,
      turnstile: screened.turnstile,
      turnstile_configured: Boolean(environment.TURNSTILE_SECRET),
      kvStored,
      emailed,
    });
  }

  /** Per-request state shared by the submission steps: logger, client meta, rate limiter and the one `finish` exit. */
  private openExchange(request: Request, environment: WorkerEnvironment, logger: Logger): Exchange {
    const startedAt = Date.now();
    const { clientProfiles, memoryCounters } = this.dependencies;
    const contactLogger = logger.forActor("ContactController");
    const meta = describeRequestMeta(request, clientProfiles);
    return {
      request,
      environment,
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
    const finish = context.finish.bind(context);
    if (request.method !== "POST") return finish(HTTP.methodNotAllowed, { error: "method_not_allowed" }, {}, { Allow: "POST" });
    if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
      return finish(HTTP.unsupportedMediaType, { error: "bad_content_type" });
    }
    if (isSameOriginRequest(request)) return undefined;
    logSecurityEvent(logger, request, {
      event: "cross_origin_post_blocked",
      severity: SecuritySeverity.High,
      reason: "Origin / Sec-Fetch-Site says the POST came from another site",
    });
    return finish(HTTP.forbidden, { error: "forbidden_origin" });
  }

  /** A client that already used its allowance is turned away before any body is read. */
  private async refuseOverLimit(context: Exchange): Promise<Response | undefined> {
    const decision = await context.limiter.peek("contact", context.meta.ip, this.dependencies.config.rateLimits.contact);
    return decision.allowed ? undefined : this.rateLimited(context, decision);
  }

  private rateLimited(context: Exchange, decision: RateDecision): Response {
    const { limit, windowSeconds } = this.dependencies.config.rateLimits.contact;
    logSecurityEvent(context.logger, context.request, {
      event: "rate_limit_exceeded",
      severity: SecuritySeverity.Medium,
      reason: `more than ${limit} submissions per ${windowSeconds}s`,
      detail: { scope: "contact" },
    });
    return context.finish(HTTP.tooManyRequests, { error: "rate_limited" }, {}, { "Retry-After": String(decision.retryAfterSeconds) });
  }

  /** Bounded body → JSON → validated submission, or the response that rejects it. */
  private async readSubmission(context: Exchange): Promise<{ response: Response; submission?: never } | { response?: never; submission: ContactSubmission }> {
    const { config } = this.dependencies;
    const rawBody = await readBoundedText(context.request, config.limits.maxContactBodyBytes);
    if (rawBody === undefined) {
      logSecurityEvent(context.logger, context.request, {
        event: "oversized_body_blocked",
        severity: SecuritySeverity.Medium,
        reason: `body larger than ${config.limits.maxContactBodyBytes} bytes`,
      });
      return { response: context.finish(HTTP.payloadTooLarge, { error: "payload_too_large" }) };
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return { response: context.finish(HTTP.badRequest, { error: "bad_json" }) };
    }

    const parsed = parseContactPayload(body, config);
    const { submission } = parsed;
    if (!submission) return { response: context.finish(HTTP.badRequest, { error: parsed.valid ? "bad_payload" : parsed.error }) };

    // Honeypot: a hidden field no human fills. Answer like a success so the bot learns nothing; store nothing.
    if (submission.honeypot !== "") return { response: await this.trapBot(context, submission) };
    if (!parsed.valid) return { response: context.finish(HTTP.unprocessable, { error: parsed.error }, { name: submission.name, email: submission.email }) };
    return { submission };
  }

  private async trapBot(context: Exchange, submission: ContactSubmission): Promise<Response> {
    const { config } = this.dependencies;
    await context.limiter.consume("contact", context.meta.ip, config.rateLimits.contact);
    logSecurityEvent(context.logger, context.request, {
      event: "honeypot_triggered",
      severity: SecuritySeverity.Medium,
      reason: "hidden form field was filled in",
      detail: { field: config.honeypotField },
    });
    return context.finish(HTTP.ok, { ok: true, emailed: false }, { name: submission.name, email: submission.email, outcome: "honeypot" });
  }

  /**
   * Counts the validated submission against the limit, then runs the CAPTCHA once a Turnstile secret is configured
   * (so the form works before setup). `turnstile_configured` is logged on every accepted submission so an unset
   * secret — CAPTCHA silently off — is visible in the logs instead of a gap nobody notices until it is abused.
   */
  private async screen(
    context: Exchange,
    submission: ContactSubmission,
  ): Promise<{ response: Response; turnstile?: never } | { response?: never; turnstile: string }> {
    const { config, turnstile } = this.dependencies;
    const decision = await context.limiter.consume("contact", context.meta.ip, config.rateLimits.contact);
    if (!decision.allowed) return { response: this.rateLimited(context, decision) };

    const secret = context.environment.TURNSTILE_SECRET;
    if (!secret) return { turnstile: "skipped" };
    if (await turnstile.verify(secret, submission.token, context.meta.ip, context.logger)) return { turnstile: "passed" };

    logSecurityEvent(context.logger, context.request, {
      event: "captcha_failed",
      severity: SecuritySeverity.Medium,
      reason: "Turnstile rejected the token (bot, expired or missing)",
    });
    const extra = { name: submission.name, email: submission.email, turnstile: "failed", turnstile_configured: true };
    return { response: context.finish(HTTP.forbidden, { error: "captcha_failed" }, extra) };
  }

  /**
   * Owner-only read: `Authorization: Bearer <ADMIN_TOKEN>` → the most recent stored submissions. The token is
   * header-only (a query-string token leaks into access logs, history and Referer). Failed attempts are counted per
   * IP and lock the client out; a lockout is a CRITICAL event because it means someone is guessing the token.
   */
  async list(request: Request, environment: WorkerEnvironment, logger: Logger): Promise<Response> {
    const { clientProfiles, memoryCounters } = this.dependencies;
    const meta = describeRequestMeta(request, clientProfiles);
    const contactLogger = logger.forActor("ContactController");
    const limiter = createRateLimiter(environment, memoryCounters);

    const unauthorized = await this.authenticateAdmin(request, environment, contactLogger, limiter, meta);
    if (unauthorized) return unauthorized;

    const store = environment.CONTACT_KV;
    if (!store) return jsonResponse({ count: 0, items: [], note: "kv_not_configured" }, HTTP.ok);
    const items = await this.readRecent(store, new URL(request.url).searchParams.get("limit"));
    logApiAccess(contactLogger, { status: HTTP.ok, outcome: "list", count: items.length, ...meta });
    return jsonResponse({ count: items.length, items }, HTTP.ok);
  }

  /** Bearer-token check with lockout; returns the refusing response, or undefined when the caller is the owner. */
  private async authenticateAdmin(
    request: Request,
    environment: WorkerEnvironment,
    logger: Logger,
    limiter: RateLimiter,
    meta: RequestMeta,
  ): Promise<Response | undefined> {
    const { adminAuthFailure } = this.dependencies.config.rateLimits;
    const lockout = await limiter.peek("admin-auth", meta.ip, adminAuthFailure);
    if (!lockout.allowed) {
      logSecurityEvent(logger, request, {
        event: "admin_locked_out",
        severity: SecuritySeverity.Critical,
        reason: `${adminAuthFailure.limit}+ failed admin authentications in ${adminAuthFailure.windowSeconds}s`,
      });
      return jsonResponse({ error: "rate_limited" }, HTTP.tooManyRequests, { "Retry-After": String(lockout.retryAfterSeconds) });
    }

    const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const adminToken = environment.ADMIN_TOKEN;
    if (adminToken && timingSafeEqual(token, adminToken)) return undefined;

    await limiter.consume("admin-auth", meta.ip, adminAuthFailure);
    logSecurityEvent(logger, request, {
      event: "admin_auth_failed",
      severity: SecuritySeverity.High,
      reason: adminToken ? "bearer token did not match" : "ADMIN_TOKEN is not configured",
      detail: { tokenSupplied: token.length > 0 },
    });
    return jsonResponse({ error: "unauthorized" }, HTTP.unauthorized, { "WWW-Authenticate": "Bearer" });
  }

  private async readRecent(store: KvNamespace, requestedLimit: string | null): Promise<StoredSubmission[]> {
    const parsedLimit = Number.parseInt(requestedLimit ?? "", 10);
    const limit = Math.min(Number.isNaN(parsedLimit) || parsedLimit < 1 ? DEFAULT_LIST_LIMIT : parsedLimit, MAX_LIST_LIMIT);
    const { keys } = await store.list({ prefix: "contact:", limit });
    const items: StoredSubmission[] = [];
    for (const key of keys) {
      const value = await store.get(key.name);
      if (value === null) continue;
      try {
        items.push(JSON.parse(value) as StoredSubmission);
      } catch {
        // A corrupt entry must not hide the others.
      }
    }
    return items.sort((first, second) => second.ts.localeCompare(first.ts));
  }

  /** Durable record in KV; the submission is still accepted if the write fails. */
  private async persist(record: StoredSubmission, environment: WorkerEnvironment, logger: Logger): Promise<boolean> {
    const store = environment.CONTACT_KV;
    if (!store) return false;
    try {
      await store.put(`contact:${record.ts}:${crypto.randomUUID()}`, JSON.stringify(record), { expirationTtl: CONTACT_RETENTION_SECONDS });
      return true;
    } catch (error) {
      logger.exception({ event: "contact_store_failed", location: CONTACT_PATH, reason: "KV put failed; submission still accepted" }, error);
      return false;
    }
  }

  /** Notification email through the Email Routing binding; never fails the visitor (the record is already stored). */
  private async notify(
    message: { name: string; email: string; project: string },
    environment: WorkerEnvironment,
    logger: Logger,
  ): Promise<boolean> {
    const { CONTACT_EMAIL: mailer, CONTACT_FROM: from, CONTACT_TO: to } = environment;
    if (!mailer || !from || !to) return false;
    try {
      await mailer.send(new EmailMessage(from, to, composeContactMail({ from, to, ...message })));
      return true;
    } catch (error) {
      logger.exception({ event: "contact_email_failed", location: CONTACT_PATH, reason: "email send failed; submission already stored" }, error);
      return false;
    }
  }
}
