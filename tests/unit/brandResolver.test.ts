import { describe, expect, it } from "vitest";
import { JsonContentRepository } from "../../src/repositories/ContentRepository";
import { BrandResolver } from "../../src/services/BrandResolver";

const contentRepository = new JsonContentRepository();
const resolver = new BrandResolver(contentRepository.brands(), contentRepository.ui());

describe("BrandResolver.distinctByIcon", () => {
  it("drops a stack whose logo already appeared (Laravel Horizon after Laravel, RediSearch after Redis)", () => {
    const stacks = ["PHP", "Laravel", "Laravel Horizon", "Lumen", "Redis", "RediSearch", "Elasticsearch"];
    expect(resolver.distinctByIcon(stacks)).toEqual(["PHP", "Laravel", "Lumen", "Redis", "Elasticsearch"]);
  });

  it("keeps the first spelling when aliases share an icon", () => {
    expect(resolver.distinctByIcon(["Vue.js", "Vue"])).toEqual(["Vue.js"]);
  });

  it("always keeps stacks without an icon (their monogram is unique)", () => {
    const unknown = ["Totally Unknown Tool", "Another Unknown Tool"];
    expect(resolver.distinctByIcon(unknown)).toEqual(unknown);
  });

  it("never leaves two pills with the same icon in any shipped stack or skill list", () => {
    const portfolio = contentRepository.portfolio();
    const lists = [...portfolio.experiences.map((role) => role.stacks), ...portfolio.skills.map((group) => group.items)];
    for (const list of lists) {
      const icons = resolver.distinctByIcon(list).map((name) => resolver.resolve(name).iconSrc).filter((icon) => icon !== null);
      expect(new Set(icons).size).toBe(icons.length);
    }
  });
});
