import { SecuritySeverity } from "../../enums/SecuritySeverity";
import type { Logger } from "../logging/Logger";
import { securityServices } from "../bootstrap/container";

export { SecuritySeverity };

export interface SecurityEvent {
  readonly event: string;
  readonly severity: SecuritySeverity;
  readonly reason: string;
  /** Extra non-sensitive facts for this event (counts, limits, field names). */
  readonly detail?: Readonly<Record<string, unknown>>;
}

/**
 * Writes one structured record: who (client profile: IP/ASN, browser, OS, device, hints, TLS fingerprint), what
 * (event), where (method + path), why (reason), when (logger clock). Critical and high severities go through
 * `logger.error` so they reach the durable channels.
 */
export function logSecurityEvent(logger: Logger, request: Request, securityEvent: SecurityEvent): void {
  const { clientProfiles } = securityServices;
  const requestInfo = clientProfiles.describeRequest(request);
  const client = clientProfiles.profile(request);
  const entry = {
    event: securityEvent.event,
    message: `${securityEvent.event} (${securityEvent.severity}) ${requestInfo.method} ${requestInfo.path}`,
    location: `${requestInfo.method} ${requestInfo.path}`,
    reason: securityEvent.reason,
    context: {
      channel: "security",
      severity: securityEvent.severity,
      summary: clientProfiles.summarize(client),
      request: requestInfo,
      client,
      ...securityEvent.detail,
    },
  };
  if (securityEvent.severity === SecuritySeverity.Critical || securityEvent.severity === SecuritySeverity.High) {
    logger.error(entry);
    return;
  }
  logger.warn(entry);
}
