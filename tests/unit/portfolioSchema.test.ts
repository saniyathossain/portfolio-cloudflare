import { describe, expect, it } from "vitest";
import rawPortfolio from "../../public/assets/data/portfolio.json";
import rawBrands from "../../src/content/brands.json";
import rawUi from "../../src/content/ui.json";
import { JsonContentRepository } from "../../src/repositories/ContentRepository";
import { createPortfolioSchema } from "../../src/schemas/portfolioSchema";
import { uiSchema } from "../../src/schemas/uiSchema";

const uiConfig = uiSchema.parse(rawUi);
const portfolioSchema = createPortfolioSchema(uiConfig);

function repositoryWith(portfolio: unknown): JsonContentRepository {
  return new JsonContentRepository({ portfolio, brands: rawBrands, ui: rawUi });
}

describe("portfolio content schema", () => {
  it("accepts the shipped portfolio.json", () => {
    expect(portfolioSchema.safeParse(rawPortfolio).success).toBe(true);
  });

  it("rejects an experience that points at an unknown company", () => {
    const broken = structuredClone(rawPortfolio);
    const [firstExperience] = broken.experiences;
    if (firstExperience) firstExperience.companySlug = "does-not-exist";
    expect(() => repositoryWith(broken).portfolio()).toThrow(/unknown company slug/);
  });

  it("rejects unknown keys so typos fail the build", () => {
    const broken = { ...structuredClone(rawPortfolio), extraneous: true };
    expect(portfolioSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a vocabulary value that ui.json does not declare", () => {
    const broken = structuredClone(rawPortfolio);
    const [firstArticle] = broken.articles;
    if (firstArticle) firstArticle.platform = "Substack";
    expect(() => repositoryWith(broken).portfolio()).toThrow(/not in ui.json vocabulary/);
  });
});
