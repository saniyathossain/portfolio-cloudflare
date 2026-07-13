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
// Maintenance page is authored as a real HTML file (src/maintenance.html) and bundled as a text
// module (wrangler treats **/*.html as Text by default), then rendered by substituting {{TOKENS}}.
import MAINTENANCE_TEMPLATE from "./maintenance.html";

const TURNSTILE = "https://challenges.cloudflare.com";

// Opt-in analytics hosts — permitted in the CSP so that IF an id/token is configured in
// portfolio.json (site.analytics.googleId / cloudflareToken), the GA4 + Cloudflare beacon scripts
// injected by sync-head.js are allowed to load. With no id set nothing is injected and no request is
// made, so the default build stays request-free — these hosts are simply allowed-but-unused.
const ANALYTICS_SCRIPT = "https://www.googletagmanager.com https://static.cloudflareinsights.com";
const ANALYTICS_CONNECT =
  "https://www.google-analytics.com https://region1.google-analytics.com https://cloudflareinsights.com";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Permitted-Cross-Domain-Policies": "none",
  // script-src needs 'unsafe-eval': Alpine.js (the standard build, not @alpinejs/csp) evaluates every
  // directive expression (x-data, x-text, x-on, x-for, …) via `new Function()`. Without this the CSP
  // silently kills the entire app — Alpine throws "Evaluating a string as JavaScript violates CSP" on
  // every single directive and nothing renders or responds to clicks. This went unnoticed because the
  // Worker (and therefore this CSP) was being bypassed in production until run_worker_first was added
  // (see docs/aidlc/43-pagespeed-cloudflare-edge.md) — the CSP had never actually been enforced live.
  "Content-Security-Policy":
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${TURNSTILE} ${ANALYTICS_SCRIPT}; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self' ${TURNSTILE} ${ANALYTICS_CONNECT}; frame-src ${TURNSTILE}; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
};

const EARLY_HINTS = [
  '</assets/img/saniyat-hossain-480.webp>; rel=preload; as=image; type=image/webp; fetchpriority=high; imagesrcset="/assets/img/saniyat-hossain-480.webp 480w, /assets/img/saniyat-hossain-900.webp 900w, /assets/img/saniyat-hossain-1300.webp 1300w, /assets/img/saniyat-hossain-1800.webp 1800w"; imagesizes="(min-width: 1024px) 62vw, 100vw"',
  "</assets/css/styles.min.css?v=da84e2004c96>; rel=preload; as=style",
  "</assets/img/bismillah.svg?v=da84e2004c96>; rel=preload; as=image; type=image/svg+xml",
  "</assets/fonts/inter-latin.woff2>; rel=preload; as=font; type=font/woff2; crossorigin",
].join(", ");

// Field limits — reject obviously abusive payloads before doing any work.
const LIMITS = { name: 120, email: 200, project: 4000 };

// ── Feature flags ────────────────────────────────────────────────────────────────────────────────
// Worker vars (wrangler.toml [vars] or Dashboard → Variables). MAINTENANCE_MODE is evaluated first
// in fetch(); SKILLS_SCROLL_DESIGN optionally overrides portfolio.json → site.features.flags.

function maintenanceOn(env) {
  const v = String(env.MAINTENANCE_MODE || "").toLowerCase();
  return v === "1" || v === "true" || v === "on";
}

function envFlagTriState(env, name) {
  const v = String(env[name] ?? "").toLowerCase().trim();
  if (!v) return null;
  if (v === "1" || v === "true" || v === "on") return true;
  if (v === "0" || v === "false" || v === "off") return false;
  return null;
}

function flagEnabled(flags, key, env, envName) {
  const fromJson = flags && flags[key];
  let jsonVal = false;
  if (typeof fromJson === "boolean") jsonVal = fromJson;
  else if (fromJson && typeof fromJson === "object" && "enabled" in fromJson) jsonVal = !!fromJson.enabled;
  const envVal = envFlagTriState(env, envName);
  if (envVal !== null) return envVal;
  return jsonVal;
}

async function mergePortfolioJson(response, env, headers) {
  const raw = await response.json();
  raw.site = raw.site || {};
  raw.site.features = raw.site.features || {};
  raw.site.features.flags = raw.site.features.flags || {};
  raw.site.features.flags.skillsScrollDesign = flagEnabled(
    raw.site.features.flags,
    "skillsScrollDesign",
    env,
    "SKILLS_SCROLL_DESIGN"
  );
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(raw), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function maintenanceResponse(env) {
  const esc = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const vars = {
    TITLE: env.MAINTENANCE_TITLE || "We’ll be right back",
    MESSAGE:
      env.MAINTENANCE_MESSAGE ||
      "The site is down briefly for scheduled maintenance and a few improvements. Please check back shortly — or reach me by email in the meantime.",
    EMAIL: env.CONTACT_TO || "saniyat1000@gmail.com",
  };
  const html = MAINTENANCE_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    key in vars ? esc(vars[key]) : ""
  );
  return new Response(html, {
    status: 503,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Retry-After": "3600",
    },
  });
}

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

// One structured single-line JSON log per API call — greppable/filterable in `wrangler tail` and the
// Workers Logs dashboard. Request metadata (method, path, status, latency, client geo/UA, CF ray id)
// plus per-route outcome fields. The raw message body is never logged (only stored in KV); logs keep
// name/email so a submission can be correlated with its stored record.
function logApi(fields) {
  console.log(JSON.stringify(Object.assign({ log: "api", at: new Date().toISOString() }, fields)));
}

// Request metadata common to every API log line.
function reqMeta(request) {
  return {
    method: request.method,
    path: new URL(request.url).pathname,
    ip: request.headers.get("CF-Connecting-IP") || "",
    country: request.headers.get("CF-IPCountry") || "",
    ray: request.headers.get("CF-Ray") || "",
    ua: request.headers.get("User-Agent") || "",
    referer: request.headers.get("Referer") || "",
  };
}

// Constant-time string compare for admin-token checks — avoids a timing side-channel on `===`.
// Length is compared normally (leaking length isn't the sensitive part; the token content is), then
// every char is XOR-accumulated so the loop's runtime doesn't depend on where a mismatch occurs.
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Per-IP submission throttle for POST /api/contact — guarded (works before CONTACT_KV is bound, same
// graceful-degradation pattern as the rest of the contact flow). Free-tier Workers have no managed
// rate-limiting, so an unbounded /api/contact can burn the daily Workers-request quota, the KV
// daily-write quota, and spam the destination inbox. One KV key per IP with a short TTL is enough to
// stop a naive hammer without needing a paid WAF rule.
async function checkRateLimit(env, ip) {
  if (!env.CONTACT_KV || !ip) return true;
  const key = `ratelimit:contact:${ip}`;
  try {
    const hit = await env.CONTACT_KV.get(key);
    if (hit) return false;
    await env.CONTACT_KV.put(key, "1", { expirationTtl: 60 });
    return true;
  } catch (err) {
    console.error("rate limit check failed:", err && err.message);
    return true; // fail open — a KV hiccup shouldn't block legitimate submissions
  }
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
    const r = await fetch(`${TURNSTILE}/turnstile/v0/siteverify`, { method: "POST", body: form });
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
  const subject = `New portfolio contact — ${name}`;
  const body = `Name: ${name}\r\nEmail: ${email}\r\n\r\n${project}\r\n`;
  const b64body = b64utf8(body).replace(/(.{76})/g, "$1\r\n"); // wrap at 76 cols per MIME
  return [
    `From: Portfolio Contact <${from}>`,
    `To: <${to}>`,
    `Reply-To: ${name} <${email}>`,
    `Message-ID: <${crypto.randomUUID()}@saniyat.com>`,
    `Date: ${new Date().toUTCString()}`,
    `Subject: =?UTF-8?B?${b64utf8(subject)}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64body,
  ].join("\r\n");
}

async function handleContact(request, env) {
  const t0 = Date.now();
  const meta = reqMeta(request);
  // Every exit point logs one structured line (status, latency + outcome fields) and returns JSON.
  const finish = (status, resBody, extra) => {
    logApi(Object.assign({ status, ms: Date.now() - t0, outcome: (resBody && resBody.error) || "ok" }, meta, extra || {}));
    return jsonResponse(resBody, status);
  };

  if (request.method !== "POST") return finish(405, { error: "method_not_allowed" });
  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return finish(415, { error: "bad_content_type" });
  }
  if (!(await checkRateLimit(env, meta.ip))) return finish(429, { error: "rate_limited" });

  let body;
  try {
    body = await request.json();
  } catch {
    return finish(400, { error: "bad_json" });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const project = String(body.project || "").trim();
  const token = String(body.token || body["cf-turnstile-response"] || "");

  // Validate before any network work.
  if (!name || !email || !project) return finish(422, { error: "missing_fields" }, { name, email });
  if (name.length > LIMITS.name || email.length > LIMITS.email || project.length > LIMITS.project) {
    return finish(422, { error: "too_long" }, { name, email });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return finish(422, { error: "bad_email" }, { name, email });

  // Anti-spam — enforced only once a Turnstile secret is configured, so the form works pre-setup.
  // turnstile_configured is logged on every accepted submission so an unset secret (anti-spam
  // silently OFF) is visible in Workers Logs instead of a gap nobody notices until it's abused.
  let turnstile = "skipped";
  if (env.TURNSTILE_SECRET) {
    const ok = await verifyTurnstile(env.TURNSTILE_SECRET, token, meta.ip);
    if (!ok) return finish(403, { error: "captcha_failed" }, { name, email, turnstile: "failed", turnstile_configured: true });
    turnstile = "passed";
  }

  const record = {
    name,
    email,
    project,
    ts: new Date().toISOString(),
    ip: meta.ip,
    country: meta.country,
    ua: meta.ua,
    ray: meta.ray,
  };

  // 1) Persist a durable record (guarded — works before the KV namespace is bound).
  let kvStored = false;
  if (env.CONTACT_KV) {
    try {
      await env.CONTACT_KV.put(
        `contact:${record.ts}:${crypto.randomUUID()}`,
        JSON.stringify(record),
        { expirationTtl: 60 * 60 * 24 * 365 }
      );
      kvStored = true;
    } catch (err) {
      console.error("KV put failed:", err && err.message);
    }
  }

  // 2) Send the notification email via the Email Routing send_email binding (guarded).
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
  }

  return finish(200, { ok: true, emailed }, {
    name,
    email,
    turnstile,
    turnstile_configured: !!env.TURNSTILE_SECRET,
    kvStored,
    emailed,
  });
}

// Admin read endpoint: GET /api/contact?token=<ADMIN_TOKEN> → the most recent stored submissions.
// Locked unless ADMIN_TOKEN is set (`npx wrangler secret put ADMIN_TOKEN`). Not linked from the UI.
async function handleContactList(request, env) {
  const meta = reqMeta(request);
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.ADMIN_TOKEN || !timingSafeEqual(token, env.ADMIN_TOKEN)) {
    logApi(Object.assign({ status: 401, outcome: "unauthorized" }, meta));
    return jsonResponse({ error: "unauthorized" }, 401);
  }
  if (!env.CONTACT_KV) return jsonResponse({ count: 0, items: [], note: "kv_not_configured" }, 200);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200);
  const list = await env.CONTACT_KV.list({ prefix: "contact:", limit });
  const items = [];
  for (const key of list.keys) {
    const val = await env.CONTACT_KV.get(key.name);
    if (val) { try { items.push(JSON.parse(val)); } catch { /* skip corrupt entry */ } }
  }
  items.sort((a, b) => String(b.ts || "").localeCompare(String(a.ts || "")));
  logApi(Object.assign({ status: 200, outcome: "list", count: items.length }, meta));
  return jsonResponse({ count: items.length, items }, 200);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Maintenance mode — hard site-wide gate (503). Owner bypass: ?preview=<ADMIN_TOKEN>.
    let previewBypass = false;
    if (maintenanceOn(env)) {
      previewBypass = env.ADMIN_TOKEN && timingSafeEqual(url.searchParams.get("preview") || "", env.ADMIN_TOKEN);
      if (!previewBypass) return maintenanceResponse(env);
    }

    // Contact API — handled before static assets; never cached, no early hints.
    // GET = token-gated admin read of stored submissions; POST = a new submission.
    if (url.pathname === "/api/contact") {
      if (request.method === "GET") return handleContactList(request, env);
      return handleContact(request, env);
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      headers.set(key, value);
    }
    const path = url.pathname;
    if (path === "/assets/data/portfolio.json" && response.ok) {
      return mergePortfolioJson(response, env, headers);
    }
    if (path.startsWith("/assets/data/") && path.endsWith(".json")) {
      headers.set("Cache-Control", "public, max-age=3600");
    } else if (path.startsWith("/assets/")) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (path === "/" || path.endsWith(".html")) {
      headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    }
    // The ?preview=<ADMIN_TOKEN> maintenance-bypass request must never be cached/shared — the token
    // querystring already makes the URL unique per-owner, but set this explicitly rather than rely on
    // that incidental behavior.
    if (previewBypass) headers.set("Cache-Control", "no-store");
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
