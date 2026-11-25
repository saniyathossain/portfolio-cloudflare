import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogLevel } from "../../src/enums/LogLevel";
import { errorPageResponse, type AssetFetcher } from "../../src/worker/http/errorPage";
import { ConsoleChannel, type ConsoleSink } from "../../src/worker/logging/channels/ConsoleChannel";
import { Logger } from "../../src/worker/logging/Logger";

/** Node has no HTMLRewriter; this stand-in records the handlers and lets the tests drive them. */
class FakeHtmlRewriter {
  static handlers = new Map<string, RewriterElementHandler>();
  on(selector: string, handler: RewriterElementHandler): this {
    FakeHtmlRewriter.handlers.set(selector, handler);
    return this;
  }
  transform(response: Response): Response {
    return response;
  }
}

const errorLines: string[] = [];
const sink: ConsoleSink = { log: () => undefined, error: (line) => errorLines.push(line) };
const logger = new Logger(new ConsoleChannel("stderr", "stderr", LogLevel.Warn, undefined, sink), {
  actor: "edge/worker",
  requestId: "ray-123",
  includeStackTrace: true,
  redactedKeys: [],
  maxStringLength: 200,
});
const baseHeaders = { "X-Content-Type-Options": "nosniff" };

beforeEach(() => {
  errorLines.length = 0;
  FakeHtmlRewriter.handlers.clear();
  vi.stubGlobal("HTMLRewriter", FakeHtmlRewriter);
});
afterEach(() => vi.unstubAllGlobals());

describe("errorPageResponse", () => {
  it("serves the generated page with the requested status and a request id header", async () => {
    const assets: AssetFetcher = { fetch: () => Promise.resolve(new Response("<h1 data-error-title>x</h1>")) };
    const response = await errorPageResponse(
      { assets, logger, baseHeaders },
      { requestUrl: "https://saniyat.com/anything", slug: "server-error", status: 500 },
    );
    expect(response.status).toBe(500);
    expect(response.headers.get("X-Request-Id")).toBe("ray-123");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Type")).toContain("text/html");
  });

  it("injects the reference id (and operator overrides) through the rewriter", async () => {
    const assets: AssetFetcher = { fetch: () => Promise.resolve(new Response("<p></p>")) };
    await errorPageResponse(
      { assets, logger, baseHeaders },
      {
        requestUrl: "https://saniyat.com/",
        slug: "maintenance",
        status: 503,
        overrides: { title: "Back at 18:00" },
      },
    );
    const captured: string[] = [];
    const element = { setInnerContent: (content: string) => captured.push(content) };
    FakeHtmlRewriter.handlers.get('[data-field="ref"]')?.element(element);
    FakeHtmlRewriter.handlers.get("[data-error-title]")?.element(element);
    FakeHtmlRewriter.handlers.get("[data-error-message]")?.element(element);
    expect(captured).toEqual(["ray-123", "Back at 18:00"]);
  });

  it("falls back to plain text, logs the exception with its stack, and exposes nothing but the ref", async () => {
    const assets: AssetFetcher = { fetch: () => Promise.reject(new Error("ASSETS exploded: secret-internal-detail")) };
    const response = await errorPageResponse(
      { assets, logger, baseHeaders },
      { requestUrl: "https://saniyat.com/", slug: "server-error", status: 500 },
    );
    await logger.drain();
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).toBe("500 — temporarily unavailable (ref ray-123)");
    expect(body).not.toContain("secret-internal-detail");
    expect(errorLines).toHaveLength(1);
    const record = JSON.parse(errorLines[0] ?? "{}") as {
      event: string;
      requestId: string;
      exception: { stack: string };
    };
    expect(record).toMatchObject({ event: "error_page_unavailable", requestId: "ray-123" });
    expect(record.exception.stack).toContain("secret-internal-detail");
  });

  it("treats a non-OK asset response as an unavailable page", async () => {
    const assets: AssetFetcher = { fetch: () => Promise.resolve(new Response("nope", { status: 404 })) };
    const response = await errorPageResponse(
      { assets, logger, baseHeaders },
      { requestUrl: "https://saniyat.com/", slug: "missing-slug", status: 502 },
    );
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(response.status).toBe(502);
  });
});
