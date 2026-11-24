import { ClientHintHeader } from "../../enums/ClientHintHeader";

const TURNSTILE = "https://challenges.cloudflare.com";

// Opt-in analytics hosts: allowed in the CSP so that IF an id/token is configured in portfolio.json
// (site.analytics.googleId / cloudflareToken) the injected GA4 / Cloudflare beacon scripts may load. With no id
// set nothing is injected and no request is made.
const ANALYTICS_SCRIPT = "https://www.googletagmanager.com https://static.cloudflareinsights.com";
const ANALYTICS_CONNECT =
  "https://www.google-analytics.com https://region1.google-analytics.com https://cloudflareinsights.com";

export const CSP_REPORT_PATH = "/api/csp-report";

// No 'unsafe-eval' any more: Alpine (which evaluated every directive through `new Function()`) is gone (docs/aidlc/61).
// 'unsafe-inline' remains for the few inline bootstrap scripts / the critical <style> in <head>; replacing them with
// hashes is the next hardening step (docs/aidlc/57).
function contentSecurityPolicy(secureTransport: boolean): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${TURNSTILE} ${ANALYTICS_SCRIPT}`,
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
