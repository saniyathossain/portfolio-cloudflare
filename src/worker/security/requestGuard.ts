import { hasControlCharacter } from "../support/controlCharacters";
import type { SecurityConfig } from "../../types/SecurityConfig";

export const GUARD_STATUS = {
  methodNotAllowed: 405,
  uriTooLong: 414,
  badRequest: 400,
  notFound: 404,
} as const;

export type GuardVerdict =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly status: number;
      /** Machine-readable log event, e.g. "scanner_probe". */
      readonly event: string;
      /** Human-readable cause for the log record only; never sent to the visitor. */
      readonly reason: string;
    };

const ALLOWED: GuardVerdict = { allowed: true };
const API_PREFIX = "/api/";

function reject(status: number, event: string, reason: string): GuardVerdict {
  return { allowed: false, status, event, reason };
}

/** Decodes the path once; undefined when it is not valid percent-encoding (itself a bad-request signal). */
function decodePath(path: string): string | undefined {
  try {
    return decodeURIComponent(path);
  } catch {
    return undefined;
  }
}

export interface RequestGuard {
  inspect(request: Request): GuardVerdict;
}

/** Cheap, pure first line of defence: runs before any asset-store or KV work, so abusive traffic costs almost nothing. */
export function createRequestGuard(config: SecurityConfig): RequestGuard {
  const blockedPatterns = config.blockedPathPatterns.map((source) => new RegExp(source));

  return {
    inspect(request) {
      const url = new URL(request.url);
      const isApi = url.pathname.startsWith(API_PREFIX);

      if (!isApi && !(config.allowedMethods as readonly string[]).includes(request.method)) {
        return reject(GUARD_STATUS.methodNotAllowed, "method_blocked", `${request.method} is not served on static paths`);
      }
      if (request.url.length > config.limits.maxUrlLength) {
        return reject(GUARD_STATUS.uriTooLong, "url_too_long", `url length ${request.url.length}`);
      }

      const decodedPath = decodePath(url.pathname);
      if (decodedPath === undefined) return reject(GUARD_STATUS.badRequest, "bad_encoding", "path is not valid percent-encoding");
      if (hasControlCharacter(decodedPath)) return reject(GUARD_STATUS.badRequest, "control_characters", "control character in path");
      if (decodedPath.includes("\\") || decodedPath.split("/").includes("..")) {
        return reject(GUARD_STATUS.badRequest, "path_traversal", "traversal sequence in path");
      }

      const lowerPath = decodedPath.toLowerCase();
      const probe = blockedPatterns.find((pattern) => pattern.test(lowerPath));
      if (probe) return reject(GUARD_STATUS.notFound, "scanner_probe", `matched ${probe.source}`);
      return ALLOWED;
    },
  };
}
