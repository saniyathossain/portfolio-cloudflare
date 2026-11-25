import type { Logger } from "../logging/Logger";
import type { ClientProfileService } from "../services/ClientProfileService";

export interface RequestMeta {
  readonly method: string;
  readonly path: string;
  readonly ip: string;
  readonly country: string;
  readonly asn: number | undefined;
  readonly ray: string;
  readonly ua: string;
  /** One-line "browser · OS · device" summary. */
  readonly client: string;
  readonly referer: string;
}

/** Request metadata common to every API log line (the shared forensic record). */
export function describeRequestMeta(request: Request, clientProfiles: ClientProfileService): RequestMeta {
  const profile = clientProfiles.profile(request);
  return {
    method: request.method,
    path: new URL(request.url).pathname,
    ip: profile.network.ip,
    country: profile.network.country,
    asn: profile.network.asn,
    ray: request.headers.get("CF-Ray") ?? "",
    ua: profile.userAgent,
    client: clientProfiles.summarize(profile),
    referer: request.headers.get("Referer") ?? "",
  };
}

export interface ApiAccessFields extends Partial<RequestMeta> {
  readonly status: number;
  readonly outcome: string;
  readonly method: string;
  readonly path: string;
  readonly [extra: string]: unknown;
}

const HTTP_SERVER_ERROR = 500;
const HTTP_CLIENT_ERROR = 400;

/**
 * One structured 5W record per API call; severity follows the HTTP status. The raw message body is never logged
 * (it is stored in KV only) — logs keep name/email so a submission can be correlated with its stored record.
 */
export function logApiAccess(logger: Logger, fields: ApiAccessFields): void {
  const entry = {
    event: "contact_api",
    message: `${fields.method} ${fields.path} → ${fields.status}`,
    location: `${fields.method} ${fields.path}`,
    reason: fields.outcome,
    context: fields,
  };
  if (fields.status >= HTTP_SERVER_ERROR) logger.error(entry);
  else if (fields.status >= HTTP_CLIENT_ERROR) logger.warn(entry);
  else logger.info(entry);
}
