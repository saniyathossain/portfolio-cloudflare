import { ClientHintHeader } from "../../enums/ClientHintHeader";

const TURNSTILE = "https://challenges.cloudflare.com";

// Opt-in analytics hosts: allowed in the CSP so that IF an id/token is configured in portfolio.json
// (site.analytics.googleId / cloudflareToken) the injected GA4 / Cloudflare beacon scripts may load. With no id
// set nothing is injected and no request is made.
const ANALYTICS_SCRIPT = "https://www.googletagmanager.com https://static.cloudflareinsights.com";
const ANALYTICS_CONNECT =
  "https://www.google-analytics.com https://region1.google-analytics.com https://cloudflareinsights.com";

export const CSP_REPORT_PATH = "/api/csp-report";

const CLOUDFLARE_BEACON_HOST = "https://static.cloudflareinsights.com";

/** Inline scripts the built pages carry, by hash (`dist/_csp.json`, written by scripts/csp-manifest.ts). */
export interface CspManifest {
  readonly scriptHashes: readonly string[];
  readonly eventHandlerHashes: readonly string[];
  readonly scriptHosts: readonly string[];
}

// No 'unsafe-eval' any more: Alpine (which evaluated every directive through `new Function()`) is gone (docs/aidlc/61).
// `PERMISSIVE_SCRIPT_SRC` (with 'unsafe-inline') is the fallback for responses that carry no built page (API answers, error
// pages the Worker renders) and for HTML when the hash manifest cannot be read; built pages get `strictScriptSrc` (docs/aidlc/73).
const PERMISSIVE_SCRIPT_SRC = `script-src 'self' 'unsafe-inline' ${TURNSTILE} ${ANALYTICS_SCRIPT}`;

function quoted(hashes: readonly string[]): string {
  return hashes.map((hash) => `'${hash}'`).join(" ");
}

function strictScriptSrc(manifest: CspManifest, allowCloudflareBeacon: boolean): string {
  // `'unsafe-inline'` after the hashes is ignored by every browser that understands hashes (CSP2+) and only keeps pre-CSP2
  // browsers working; it is the fallback Lighthouse recommends.
  const sources = ["'self'", quoted(manifest.scriptHashes), "'unsafe-inline'"];
  // Inline handlers (the stylesheet preload's onload/onerror) need 'unsafe-hashes' plus the hash of the handler text.
  if (manifest.eventHandlerHashes.length > 0) sources.push("'unsafe-hashes'", quoted(manifest.eventHandlerHashes));
  sources.push(...manifest.scriptHosts);
  if (allowCloudflareBeacon) sources.push(CLOUDFLARE_BEACON_HOST);
  return `script-src ${sources.filter((source) => source !== "").join(" ")}`;
}

function contentSecurityPolicy(secureTransport: boolean, scriptSrc: string = PERMISSIVE_SCRIPT_SRC): string {
  const directives = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: https:",
    `connect-src 'self' ${TURNSTILE} ${ANALYTICS_CONNECT}`,
    `frame-src ${TURNSTILE}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    `report-uri ${CSP_REPORT_PATH}`,
  ];
  // Upgrading would break plain-http `wrangler dev`, so it only applies on real HTTPS traffic.
  if (secureTransport) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

/** Headers added to every response the Worker produces. */
export function buildSecurityHeaders(requestUrl: string): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), interest-cohort=(), browsing-topics=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Origin-Agent-Cluster": "?1",
    "Content-Security-Policy": contentSecurityPolicy(new URL(requestUrl).protocol === "https:"),
  };
}

/**
 * Policy for built HTML pages: no 'unsafe-inline' for scripts, only the hashes in `manifest`. The Cloudflare Web Analytics beacon
 * host stays allowed while `allowCloudflareBeacon` is true (the dashboard's automatic injection), so it is not reported as a violation.
 */
export function strictContentSecurityPolicy(
  requestUrl: string,
  manifest: CspManifest,
  allowCloudflareBeacon: boolean,
): string {
  return contentSecurityPolicy(
    new URL(requestUrl).protocol === "https:",
    strictScriptSrc(manifest, allowCloudflareBeacon),
  );
}

/** Extra headers for JSON API answers: never cached, never indexed, never sniffed. */
export const API_RESPONSE_HEADERS: Readonly<Record<string, string>> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

// High-entropy client hints (device model, OS version, CPU architecture) are only sent after the server asks for them.
// They feed the security log (docs/aidlc/58) and nothing else. The low-entropy ones (brands, mobile, platform) are sent
// by default and need no opt-in.
const REQUESTED_CLIENT_HINTS: readonly ClientHintHeader[] = [
  ClientHintHeader.FullVersionList,
  ClientHintHeader.PlatformVersion,
  ClientHintHeader.Model,
  ClientHintHeader.Architecture,
  ClientHintHeader.Bitness,
];

/** Value for the `Accept-CH` response header, set on HTML responses only. */
export const ACCEPT_CLIENT_HINTS: string = REQUESTED_CLIENT_HINTS.join(", ");
