const NO_TRANSFORM = "no-transform";

/**
 * Adds `no-transform` to a Cache-Control value. Cloudflare then leaves the HTML untouched, which stops the automatic
 * Web Analytics beacon (a ~10 KB third-party script plus a /cdn-cgi/rum request) from being injected into every page.
 */
export function withNoTransform(cacheControl: string | null): string {
  const current = (cacheControl ?? "").trim();
  if (current === "") return NO_TRANSFORM;
  if (current.split(",").some((directive) => directive.trim().toLowerCase() === NO_TRANSFORM)) return current;
  return `${current}, ${NO_TRANSFORM}`;
}
