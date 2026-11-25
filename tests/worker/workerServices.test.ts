import { describe, expect, it } from "vitest";
import { timingSafeEqual } from "../../src/worker/support/timingSafeEqual";
import { composeContactMail, encodeBase64Utf8 } from "../../src/worker/services/ContactMailComposer";
import { isMaintenanceOn, readEnvironmentFlag, resolveFlag } from "../../src/worker/services/FeatureFlags";
import { readBoundedText } from "../../src/worker/http/readBoundedText";
import type { WorkerEnvironment } from "../../src/worker/types/WorkerEnvironment";

const noAssets = { fetch: () => Promise.reject(new Error("not used")) };
const environment = (values: Record<string, string>): WorkerEnvironment => ({ ASSETS: noAssets, ...values });

describe("timingSafeEqual", () => {
  it("matches equal strings and rejects different content or length", () => {
    expect(timingSafeEqual("secret-token", "secret-token")).toBe(true);
    expect(timingSafeEqual("secret-token", "secret-tokeN")).toBe(false);
    expect(timingSafeEqual("secret", "secret-token")).toBe(false);
    expect(timingSafeEqual("", "")).toBe(true);
  });
});

describe("FeatureFlags", () => {
  it("reads truthy, falsy and unrecognised Worker vars", () => {
    expect(readEnvironmentFlag(" ON ")).toBe(true);
    expect(readEnvironmentFlag("0")).toBe(false);
    expect(readEnvironmentFlag("maybe")).toBeNull();
    expect(readEnvironmentFlag(undefined)).toBeNull();
  });

  it("resolves a JSON flag (boolean or {enabled}) with the Worker var overriding it", () => {
    expect(resolveFlag(true, undefined)).toBe(true);
    expect(resolveFlag({ enabled: true }, undefined)).toBe(true);
    expect(resolveFlag({ enabled: true }, "off")).toBe(false);
    expect(resolveFlag(undefined, "1")).toBe(true);
    expect(resolveFlag(undefined, undefined)).toBe(false);
  });

  it("detects maintenance mode", () => {
    expect(isMaintenanceOn(environment({ MAINTENANCE_MODE: "on" }))).toBe(true);
    expect(isMaintenanceOn(environment({ MAINTENANCE_MODE: "off" }))).toBe(false);
    expect(isMaintenanceOn(environment({}))).toBe(false);
  });
});

describe("composeContactMail", () => {
  const base = { from: "contact@saniyat.com", to: "owner@example.com", email: "eve@example.com", project: "Hello" };
  const fixed = [`id-1`, new Date("2026-11-24T10:00:00Z")] as const;

  it("builds a single-block header with an encoded subject and base64 body", () => {
    const raw = composeContactMail({ ...base, name: "Ada Lovelace" }, ...fixed);
    expect(raw).toContain("Reply-To: Ada Lovelace <eve@example.com>");
    expect(raw).toContain("Message-ID: <id-1@saniyat.com>");
    expect(raw).toContain(`Subject: =?UTF-8?B?${encodeBase64Utf8("New portfolio contact — Ada Lovelace")}?=`);
    expect(raw).toContain("Content-Transfer-Encoding: base64");
  });

  it("cannot be used to inject headers through the visitor name", () => {
    const raw = composeContactMail({ ...base, name: "Eve\r\nBcc: victim@example.com" }, ...fixed);
    const headerBlock = raw.split("\r\n\r\n")[0] ?? "";
    expect(headerBlock).not.toMatch(/^Bcc:/m);
    expect(headerBlock.split("\r\n").filter((line) => line.startsWith("Reply-To:"))).toHaveLength(1);
  });

  it("falls back to a neutral name when nothing safe is left", () => {
    expect(composeContactMail({ ...base, name: '<>"\\' }, ...fixed)).toContain("Reply-To: Visitor <eve@example.com>");
  });

  it("encodes unicode safely", () => {
    expect(atob(encodeBase64Utf8("বাংলা ✓"))).toBeTypeOf("string");
    expect(encodeBase64Utf8("é")).toBe("w6k=");
  });
});

describe("readBoundedText", () => {
  const post = (body: string, headers: Record<string, string> = {}) =>
    new Request("https://saniyat.com/api/contact", { method: "POST", body, headers });

  it("returns the text under the limit and undefined over it", async () => {
    expect(await readBoundedText(post("hello"), 10)).toBe("hello");
    expect(await readBoundedText(post("x".repeat(50)), 10)).toBeUndefined();
  });

  it("rejects on the declared Content-Length before reading", async () => {
    expect(await readBoundedText(post("hi", { "content-length": "9999" }), 10)).toBeUndefined();
  });
});

describe("withNoTransform", () => {
  it("adds the directive once and keeps the existing ones", async () => {
    const { withNoTransform } = await import("../../src/worker/http/cacheControl");
    expect(withNoTransform(null)).toBe("no-transform");
    expect(withNoTransform("public, max-age=0, must-revalidate")).toBe(
      "public, max-age=0, must-revalidate, no-transform",
    );
    expect(withNoTransform("public, No-Transform")).toBe("public, No-Transform");
  });
});
