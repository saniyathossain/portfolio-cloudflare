import { describe, expect, it } from "vitest";
import { loadCspManifest, parseCspManifest } from "../../src/worker/security/cspManifest";
import { buildSecurityHeaders, strictContentSecurityPolicy } from "../../src/worker/security/headers";
import type { AssetBinding } from "../../src/worker/types/WorkerEnvironment";

const HASH = "sha256-/hORfdICpAo8j4ic/Q/roH7ucwpIaw8leYO3wjev7MI=";
const HANDLER_HASH = "sha256-bOeYpQ3tLQaRpi3Lk4fcmGM/nmJhvJ3Ht+DwPmWOVz8=";
const manifest = { scriptHashes: [HASH], eventHandlerHashes: [HANDLER_HASH], scriptHosts: [] as string[] };

describe("strictContentSecurityPolicy", () => {
  it("allows inline scripts by hash, with 'unsafe-inline' only as the CSP1 fallback after them", () => {
    const policy = strictContentSecurityPolicy("https://saniyat.com/", manifest, true);
    const scriptSrc = policy.split("; ").find((directive) => directive.startsWith("script-src")) ?? "";
    expect(scriptSrc).toContain(`'${HASH}'`);
    expect(scriptSrc).toContain("'unsafe-hashes'");
    expect(scriptSrc).toContain(`'${HANDLER_HASH}'`);
    // Browsers that understand hashes ignore 'unsafe-inline' once a hash is present, so the hashes stay authoritative.
    expect(scriptSrc.indexOf("'unsafe-inline'")).toBeGreaterThan(scriptSrc.indexOf(`'${HASH}'`));
    expect(scriptSrc).not.toContain("challenges.cloudflare.com");
    expect(scriptSrc).not.toContain("googletagmanager");
  });

  it("allows Cloudflare's beacon host only while asked to, and manifest hosts when the build needs them", () => {
    const withBeacon = strictContentSecurityPolicy("https://saniyat.com/", manifest, true);
    const withoutBeacon = strictContentSecurityPolicy(
      "https://saniyat.com/",
      { ...manifest, scriptHosts: ["https://challenges.cloudflare.com"] },
      false,
    );
    expect(withBeacon).toContain("script-src 'self'");
    expect(withBeacon).toContain("static.cloudflareinsights.com");
    expect(withoutBeacon).not.toContain(
      "script-src 'self' 'sha256-/hORfdICpAo8j4ic/Q/roH7ucwpIaw8leYO3wjev7MI=' 'unsafe-hashes' 'sha256-bOeYpQ3tLQaRpi3Lk4fcmGM/nmJhvJ3Ht+DwPmWOVz8=' https://static",
    );
    const scriptSrc = withoutBeacon.split("; ").find((directive) => directive.startsWith("script-src")) ?? "";
    expect(scriptSrc).toContain("https://challenges.cloudflare.com");
    expect(scriptSrc).not.toContain("cloudflareinsights");
  });

  it("keeps every other directive identical to the default policy", () => {
    const strictRest = strictContentSecurityPolicy("https://saniyat.com/", manifest, true)
      .split("; ")
      .filter((directive) => !directive.startsWith("script-src"));
    const defaultRest = (buildSecurityHeaders("https://saniyat.com/")["Content-Security-Policy"] ?? "")
      .split("; ")
      .filter((directive) => !directive.startsWith("script-src"));
    expect(strictRest).toEqual(defaultRest);
  });
});

describe("parseCspManifest", () => {
  it("accepts the generated shape and rejects anything else", () => {
    expect(parseCspManifest(manifest)).toEqual(manifest);
    expect(parseCspManifest({ ...manifest, scriptHashes: ["nope"] })).toBeUndefined();
    expect(parseCspManifest({ ...manifest, scriptHosts: ["http://evil.example"] })).toBeUndefined();
    expect(parseCspManifest({ scriptHashes: [HASH] })).toBeUndefined();
    expect(parseCspManifest(null)).toBeUndefined();
  });
});

describe("loadCspManifest", () => {
  function binding(answer: () => Response): { assets: AssetBinding; calls: () => number } {
    let calls = 0;
    return {
      assets: {
        fetch: () => {
          calls += 1;
          return Promise.resolve(answer());
        },
      },
      calls: () => calls,
    };
  }

  it("fetches once per isolate", async () => {
    const { assets, calls } = binding(() => Response.json(manifest));
    expect(await loadCspManifest(assets, "https://saniyat.com")).toEqual(manifest);
    await loadCspManifest(assets, "https://saniyat.com");
    expect(calls()).toBe(1);
  });

  it("forgets a failed lookup so the next request retries", async () => {
    const { assets, calls } = binding(() => new Response("nope", { status: 404 }));
    expect(await loadCspManifest(assets, "https://saniyat.com")).toBeUndefined();
    await Promise.resolve();
    await loadCspManifest(assets, "https://saniyat.com");
    expect(calls()).toBe(2);
  });
});
