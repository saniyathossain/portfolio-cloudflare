import { describe, expect, it } from "vitest";
import rawSecurity from "../../src/content/security.json";
import { securitySchema } from "../../src/schemas/securitySchema";
import { parseContactPayload, toHeaderSafeName, toSingleLine } from "../../src/worker/security/contactPayload";
import { buildSecurityHeaders, CSP_REPORT_PATH } from "../../src/worker/security/headers";
import { isSameOriginRequest } from "../../src/worker/security/originGuard";
import { createRateLimiter } from "../../src/worker/security/rateLimiter";
import { createRequestGuard } from "../../src/worker/security/requestGuard";

const config = securitySchema.parse(rawSecurity);
const guard = createRequestGuard(config);
const get = (path: string, init?: RequestInit) => new Request(`https://saniyat.com${path}`, init);

describe("security.json", () => {
  it("passes its schema and rejects unknown keys", () => {
    expect(() => securitySchema.parse({ ...rawSecurity, surprise: 1 })).toThrow();
  });
});

describe("request guard", () => {
  it("lets normal pages and assets through", () => {
    for (const path of ["/", "/assets/css/styles.min.css", "/.well-known/security.txt", "/errors/offline/", "/api/contact"]) {
      expect(guard.inspect(get(path)).allowed, path).toBe(true);
    }
  });

  it("answers scanner probes with 404 and a probe event", () => {
    for (const path of ["/.env", "/.git/config", "/wp-login.php", "/wp-admin/", "/xmlrpc.php", "/phpmyadmin/", "/backup.sql", "/shell.PHP", "/config.ini"]) {
      const verdict = guard.inspect(get(path));
      expect(verdict, path).toMatchObject({ allowed: false, status: 404, event: "scanner_probe" });
    }
  });

  it("blocks traversal, control characters and bad encoding", () => {
    // The URL parser already collapses dot segments (even %2e%2e), so those never reach the guard as "..".
    expect(new URL("https://saniyat.com/assets/%2e%2e/secret").pathname).toBe("/secret");
    expect(guard.inspect(get("/a%00b"))).toMatchObject({ allowed: false, event: "control_characters" });
    expect(guard.inspect(get("/%E0%A4%A"))).toMatchObject({ allowed: false, event: "bad_encoding" });
    expect(guard.inspect(get("/a%5Cb"))).toMatchObject({ allowed: false, event: "path_traversal" });
  });

  it("rejects overlong URLs", () => {
    const verdict = guard.inspect(get(`/?q=${"a".repeat(config.limits.maxUrlLength)}`));
    expect(verdict).toMatchObject({ allowed: false, status: 414 });
  });

  it("allows only GET/HEAD/OPTIONS on static paths but any method reaches the API handlers", () => {
    expect(guard.inspect(get("/", { method: "POST" }))).toMatchObject({ allowed: false, status: 405, event: "method_blocked" });
    expect(guard.inspect(get("/", { method: "DELETE" }))).toMatchObject({ allowed: false, status: 405 });
    expect(guard.inspect(get("/", { method: "HEAD" })).allowed).toBe(true);
    expect(guard.inspect(get("/api/contact", { method: "POST" })).allowed).toBe(true);
  });
});

describe("origin guard", () => {
  const post = (headers: Record<string, string>) => get("/api/contact", { method: "POST", headers });
  it("accepts same-origin and header-less clients, rejects foreign origins", () => {
    expect(isSameOriginRequest(post({ Origin: "https://saniyat.com" }))).toBe(true);
    expect(isSameOriginRequest(post({}))).toBe(true);
    expect(isSameOriginRequest(post({ "Sec-Fetch-Site": "same-origin" }))).toBe(true);
    expect(isSameOriginRequest(post({ Origin: "https://evil.example" }))).toBe(false);
    expect(isSameOriginRequest(post({ Origin: "null" }))).toBe(false);
    expect(isSameOriginRequest(post({ "Sec-Fetch-Site": "cross-site" }))).toBe(false);
  });
});

describe("rate limiter", () => {
  const rule = { limit: 2, windowSeconds: 60 };
  it("allows up to the limit then blocks, per key, and rolls over with the window", async () => {
    let now = 1_000_000;
    const limiter = createRateLimiter({}, new Map(), () => now);
    expect((await limiter.consume("contact", "1.1.1.1", rule)).allowed).toBe(true);
    expect((await limiter.consume("contact", "1.1.1.1", rule)).allowed).toBe(true);
    const blocked = await limiter.consume("contact", "1.1.1.1", rule);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect((await limiter.consume("contact", "2.2.2.2", rule)).allowed).toBe(true);
    now += 61_000;
    expect((await limiter.consume("contact", "1.1.1.1", rule)).allowed).toBe(true);
  });

  it("peek does not count, and an empty key or a failing store fails open", async () => {
    const limiter = createRateLimiter({}, new Map());
    await limiter.consume("admin", "9.9.9.9", rule);
    await limiter.consume("admin", "9.9.9.9", rule);
    expect((await limiter.peek("admin", "9.9.9.9", rule)).allowed).toBe(false);
    expect((await limiter.consume("admin", "", rule)).allowed).toBe(true);
    const broken = createRateLimiter(
      { CONTACT_KV: { get: () => Promise.reject(new Error("kv down")), put: () => Promise.reject(new Error("kv down")) } },
      new Map(),
    );
    expect((await broken.consume("contact", "3.3.3.3", rule)).allowed).toBe(true);
  });

  it("prefers the Workers rate-limit binding when present", async () => {
    const limiter = createRateLimiter({ RATE_LIMITER: { limit: () => Promise.resolve({ success: false }) } }, new Map());
    expect((await limiter.consume("contact", "4.4.4.4", rule)).allowed).toBe(false);
  });
});

describe("contact payload", () => {
  const valid = { name: "Ada Lovelace", email: "ada@example.com", project: "Hello there" };
  it("accepts a clean submission", () => {
    expect(parseContactPayload(valid, config)).toMatchObject({ valid: true });
  });

  it("rejects non-object bodies and coerces nothing", () => {
    for (const body of [null, "x", 5, [], undefined]) expect(parseContactPayload(body, config)).toMatchObject({ valid: false, error: "bad_payload" });
    expect(parseContactPayload({ ...valid, name: { nested: 1 } }, config)).toMatchObject({ valid: false, error: "missing_fields" });
  });

  it("enforces lengths and email shape", () => {
    expect(parseContactPayload({ ...valid, project: "x".repeat(config.limits.maxProjectLength + 1) }, config)).toMatchObject({ error: "too_long" });
    expect(parseContactPayload({ ...valid, email: "nope" }, config)).toMatchObject({ error: "bad_email" });
    expect(parseContactPayload({ ...valid, email: "a@b.co>\r\nBcc: x@y.z" }, config)).toMatchObject({ error: "bad_email" });
  });

  it("strips line breaks from single-line fields (mail header injection)", () => {
    const result = parseContactPayload({ ...valid, name: "Eve\r\nBcc: victim@example.com" }, config);
    expect(result).toMatchObject({ valid: true });
    if (result.valid) expect(result.submission.name).not.toMatch(/[\r\n]/);
    expect(toSingleLine("a\u0000b\nc")).toBe("ab c");
    expect(toHeaderSafeName('Eve" <x@y.z>')).toBe("Eve x@y.z");
  });

  it("surfaces the honeypot value", () => {
    const result = parseContactPayload({ ...valid, [config.honeypotField]: "Acme Ltd" }, config);
    expect(result).toMatchObject({ valid: true });
    if (result.valid) expect(result.submission.honeypot).toBe("Acme Ltd");
  });
});

describe("security headers", () => {
  it("sets the hardened header set and a CSP with reporting", () => {
    const headers = buildSecurityHeaders("https://saniyat.com/");
    expect(headers["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain(`report-uri ${CSP_REPORT_PATH}`);
    expect(headers["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
  });

  it("does not upgrade to https on plain-http local development", () => {
    expect(buildSecurityHeaders("http://127.0.0.1:8787/")["Content-Security-Policy"]).not.toContain("upgrade-insecure-requests");
  });
});
