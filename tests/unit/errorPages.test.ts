import { describe, expect, it } from "vitest";
import rawErrors from "../../src/content/errors.json";
import { errorsSchema } from "../../src/schemas/errorsSchema";

describe("error page content", () => {
  const catalog = errorsSchema.parse(rawErrors);
  const pages = Object.entries(catalog.pages);

  it("keys every page by its own slug", () => {
    for (const [pageKey, page] of pages) expect(page.slug, pageKey).toBe(pageKey);
  });

  it("covers every failure the Worker and service worker can serve", () => {
    const slugs = pages.map(([, page]) => page.slug);
    expect(slugs).toEqual(
      expect.arrayContaining(["not-found", "server-error", "bad-gateway", "maintenance", "offline"]),
    );
  });

  it("gives each HTTP error a unique status code", () => {
    const statuses = pages.flatMap(([, page]) => (page.status === null ? [] : [page.status]));
    expect(new Set(statuses).size).toBe(statuses.length);
  });

  it("offers at least one way out on every page", () => {
    for (const [pageKey, page] of pages) {
      const hasWayOut = page.actions.some((action) => action.isReload === true || action.href !== undefined);
      expect(hasWayOut, pageKey).toBe(true);
    }
  });

  it("rejects an unknown key so typos fail the build", () => {
    expect(errorsSchema.safeParse({ ...rawErrors, extra: 1 }).success).toBe(false);
  });
});
