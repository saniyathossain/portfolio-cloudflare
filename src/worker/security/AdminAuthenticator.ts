import { ApiErrorCode } from "../../enums/ApiErrorCode";
import { HttpStatus } from "../../enums/HttpStatus";
import { SecuritySeverity } from "../../enums/SecuritySeverity";
import type { RateRule } from "../../types/SecurityConfig";
import { jsonResponse } from "../http/jsonResponse";
import type { Logger } from "../logging/Logger";
import { timingSafeEqual } from "../support/timingSafeEqual";
import type { RateLimiter } from "./rateLimiter";
import { logSecurityEvent } from "./securityEvents";

/**
 * Owner-only authentication: `Authorization: Bearer <ADMIN_TOKEN>`. The token is header-only (a query-string token leaks
 * into access logs, history and Referer). Failed attempts are counted per IP and lock the client out; a lockout is
 * CRITICAL because it means someone is guessing the token.
 */
export class AdminAuthenticator {
  constructor(
    private readonly adminToken: string | undefined,
    private readonly limiter: RateLimiter,
    private readonly failureRule: RateRule,
  ) {}

  /** The response that refuses the caller, or undefined when the caller is the owner. */
  async refuse(request: Request, clientIp: string, logger: Logger): Promise<Response | undefined> {
    const lockout = await this.limiter.peek("admin-auth", clientIp, this.failureRule);
    if (!lockout.allowed) {
      logSecurityEvent(logger, request, {
        event: "admin_locked_out",
        severity: SecuritySeverity.Critical,
        reason: `${this.failureRule.limit}+ failed admin authentications in ${this.failureRule.windowSeconds}s`,
      });
      return jsonResponse({ error: ApiErrorCode.RateLimited }, HttpStatus.TooManyRequests, {
        "Retry-After": String(lockout.retryAfterSeconds),
      });
    }

    const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (this.adminToken && timingSafeEqual(token, this.adminToken)) return undefined;

    await this.limiter.consume("admin-auth", clientIp, this.failureRule);
    logSecurityEvent(logger, request, {
      event: "admin_auth_failed",
      severity: SecuritySeverity.High,
      reason: this.adminToken ? "bearer token did not match" : "ADMIN_TOKEN is not configured",
      detail: { tokenSupplied: token.length > 0 },
    });
    return jsonResponse({ error: ApiErrorCode.Unauthorized }, HttpStatus.Unauthorized, { "WWW-Authenticate": "Bearer" });
  }
}
