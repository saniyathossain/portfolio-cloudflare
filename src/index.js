/**
 * Cloudflare Worker — serves static assets, applies security headers, cache policy and preload hints,
 * and handles the contact form (POST /api/contact).
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 *
 * CSP keeps 'unsafe-inline' by design: Alpine.js evaluates inline `x-data`/`x-bind` expressions and
 * the loader-kickoff runs as an inline <script>. A nonce would require rewriting the HTML per
 * request (defeating edge caching) for no real gain on a static, single-author site, so the surface
 * is instead reduced with cross-origin isolation + resource-policy headers below. challenges.cloudflare.com
 * is allowed for the Turnstile anti-spam widget on the contact form (script/frame/connect).
 *
 * Contact flow (see handleContact): validate → Turnstile verify (if configured) → persist to KV +
 * console log → send a notification email via the Email Routing `send_email` binding. Every backing
 * service is optional/guarded so the endpoint degrades gracefully before the bindings are configured.
 */
import { EmailMessage } from "cloudflare:email";

const TURNSTILE = "https://challenges.cloudflare.com";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' " + TURNSTILE + "; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self' " + TURNSTILE + "; frame-src " + TURNSTILE + "; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

const EARLY_HINTS = [
  '</assets/img/saniyat-hossain-480.webp>; rel=preload; as=image; type=image/webp; fetchpriority=high; imagesrcset="/assets/img/saniyat-hossain-480.webp 480w, /assets/img/saniyat-hossain-900.webp 900w, /assets/img/saniyat-hossain-1300.webp 1300w, /assets/img/saniyat-hossain-1800.webp 1800w"; imagesizes="(min-width: 1024px) 62vw, 100vw"',
  "</assets/css/styles.min.css?v=feb7967b9aa4>; rel=preload; as=style",
  "</assets/img/bismillah.svg?v=feb7967b9aa4>; rel=preload; as=image; type=image/svg+xml",
].join(", ");

// Field limits — reject obviously abusive payloads before doing any work.
const LIMITS = { name: 120, email: 200, project: 4000 };

function isHtmlResponse(url, response) {
  const path = new URL(url).pathname;
  if (path === "/" || path.endsWith(".html")) return true;
  const ct = response.headers.get("content-type") || "";
  return ct.includes("text/html");
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

// UTF-8-safe base64 (btoa only handles latin1) — used for the email subject/body encoding.
function b64utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// Server-side Turnstile verification. Only called when TURNSTILE_SECRET is configured.
async function verifyTurnstile(secret, token, ip) {
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const r = await fetch(TURNSTILE + "/turnstile/v0/siteverify", { method: "POST", body: form });
    const data = await r.json();
    return !!(data && data.success);
  } catch (err) {
    console.error("turnstile verify failed:", err && err.message);
    return false;
  }
}

// Build a minimal, spec-valid RFC 5322 message. Subject + body are base64/encoded-word so any
// unicode a visitor types survives. Reply-To is the visitor so a reply goes straight back to them.
function buildMime({ from, to, name, email, project }) {
  const subject = "New portfolio contact — " + name;
  const body =
    "Name: " + name + "\r\n" +
    "Email: " + email + "\r\n\r\n" +
    project + "\r\n";
  const b64body = b64utf8(body).replace(/(.{76})/g, "$1\r\n"); // wrap at 76 cols per MIME
  return [
    "From: Portfolio Contact <" + from + ">",
    "To: <" + to + ">",
    "Reply-To: " + name + " <" + email + ">",
    "Message-ID: <" + crypto.randomUUID() + "@saniyat.com>",
    "Date: " + new Date().toUTCString(),
    "Subject: =?UTF-8?B?" + b64utf8(subject) + "?=",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64body,
  ].join("\r\n");
}

async function handleContact(request, env) {
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return jsonResponse({ error: "bad_content_type" }, 415);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const project = String(body.project || "").trim();
  const token = String(body.token || body["cf-turnstile-response"] || "");

  // Validate before any network work.
  if (!name || !email || !project) return jsonResponse({ error: "missing_fields" }, 422);
  if (name.length > LIMITS.name || email.length > LIMITS.email || project.length > LIMITS.project) {
    return jsonResponse({ error: "too_long" }, 422);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jsonResponse({ error: "bad_email" }, 422);

  // Anti-spam — enforced only once a Turnstile secret is configured, so the form works pre-setup.
  if (env.TURNSTILE_SECRET) {
    const ok = await verifyTurnstile(env.TURNSTILE_SECRET, token, request.headers.get("CF-Connecting-IP"));
    if (!ok) return jsonResponse({ error: "captcha_failed" }, 403);
  }

  const record = {
    name,
    email,
    project,
    ts: new Date().toISOString(),
    ip: request.headers.get("CF-Connecting-IP") || "",
    country: request.headers.get("CF-IPCountry") || "",
    ua: request.headers.get("User-Agent") || "",
  };

  // 1) Log — visible in `wrangler tail` / Workers Logs. Never log the full message body verbatim.
  console.log("contact submission", JSON.stringify({ name, email, country: record.country, ts: record.ts }));

  // 2) Persist a durable record (guarded — works before the KV namespace is bound).
  if (env.CONTACT_KV) {
    try {
      await env.CONTACT_KV.put(
        "contact:" + record.ts + ":" + crypto.randomUUID(),
        JSON.stringify(record),
        { expirationTtl: 60 * 60 * 24 * 365 }
      );
    } catch (err) {
      console.error("KV put failed:", err && err.message);
    }
  }

  // 3) Send the notification email via the Email Routing send_email binding (guarded).
  let emailed = false;
  if (env.CONTACT_EMAIL && env.CONTACT_FROM && env.CONTACT_TO) {
    try {
      const raw = buildMime({ from: env.CONTACT_FROM, to: env.CONTACT_TO, name, email, project });
      await env.CONTACT_EMAIL.send(new EmailMessage(env.CONTACT_FROM, env.CONTACT_TO, raw));
      emailed = true;
    } catch (err) {
      // The submission is already saved to KV + logs, so don't fail the visitor — just record it.
      console.error("contact email send failed:", err && err.message);
    }
  } else {
    console.warn("contact email skipped — Email Routing binding/vars not configured");
  }

  return jsonResponse({ ok: true, emailed }, 200);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Contact API — handled before static assets; never cached, no early hints.
    if (url.pathname === "/api/contact") {
      return handleContact(request, env);
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      headers.set(key, value);
    }
    const path = url.pathname;
    if (path.startsWith("/assets/data/") && path.endsWith(".json")) {
      headers.set("Cache-Control", "public, max-age=3600");
    } else if (path.startsWith("/assets/")) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (path === "/" || path.endsWith(".html")) {
      headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    }
    if (isHtmlResponse(request.url, response)) {
      headers.set("Link", EARLY_HINTS);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
