/**
 * CSRF / cross-site-posting defence for state-changing endpoints. Browsers always send `Origin` on a cross-origin
 * POST and `Sec-Fetch-Site` on every request, so a present-but-foreign value is a hostile page, not a visitor.
 * Requests with neither header (curl, server-side clients) pass this check; they are held back by rate limits,
 * Turnstile and the honeypot instead.
 */
export function isSameOriginRequest(request: Request): boolean {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("Origin");
  if (origin !== null) return origin === requestOrigin;
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite === null) return true;
  return fetchSite === "same-origin" || fetchSite === "none";
}
