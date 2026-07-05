/** Cloudflare Worker — serves static assets + security headers + preload hints */
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

const EARLY_HINTS = [
  '</assets/img/saniyat-hossain-480.webp>; rel=preload; as=image; type=image/webp; fetchpriority=high; imagesrcset="/assets/img/saniyat-hossain-480.webp 480w, /assets/img/saniyat-hossain-900.webp 900w, /assets/img/saniyat-hossain-1300.webp 1300w, /assets/img/saniyat-hossain-1800.webp 1800w"; imagesizes="(min-width: 1024px) 62vw, 100vw"',
  "</assets/css/styles.min.css?v=ac416f632ae7>; rel=preload; as=style",
  "</assets/img/bismillah.svg?v=ac416f632ae7>; rel=preload; as=image; type=image/svg+xml",
].join(", ");

function isHtmlResponse(url, response) {
  const path = new URL(url).pathname;
  if (path === "/" || path.endsWith(".html")) return true;
  const ct = response.headers.get("content-type") || "";
  return ct.includes("text/html");
}

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      headers.set(key, value);
    }
    const url = request.url;
    const path = new URL(url).pathname;
    if (path.startsWith("/assets/data/") && path.endsWith(".json")) {
      headers.set("Cache-Control", "public, max-age=3600");
    } else if (path.startsWith("/assets/")) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (path === "/" || path.endsWith(".html")) {
      headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    }
    if (isHtmlResponse(url, response)) {
      headers.set("Link", EARLY_HINTS);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
