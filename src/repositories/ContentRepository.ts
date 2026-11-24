import rawBrands from "../content/brands.json";
import rawUi from "../content/ui.json";
import rawPortfolio from "../../public/assets/data/portfolio.json";
import { brandsSchema } from "../schemas/brandsSchema";
import { createPortfolioSchema } from "../schemas/portfolioSchema";
import { uiSchema } from "../schemas/uiSchema";
import type { Portfolio } from "../types/Portfolio";
import type { BrandCatalog, UiConfig } from "../types/UiConfig";

/** The only module that reads content. Fails the build on malformed data instead of rendering a broken page. */
export interface ContentRepository {
  portfolio(): Portfolio;
  brands(): BrandCatalog;
  ui(): UiConfig;
}

export interface ContentSources {
  readonly portfolio: unknown;
  readonly brands: unknown;
  readonly ui: unknown;
}

const SHIPPED_SOURCES: ContentSources = { portfolio: rawPortfolio, brands: rawBrands, ui: rawUi };

interface ParseOutcome<TValue> {
  readonly success: boolean;
  readonly data?: TValue;
  readonly error?: { readonly issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[] };
}

function unwrapOrThrow<TValue>(label: string, outcome: ParseOutcome<TValue>): TValue {
  if (outcome.success && outcome.data !== undefined) return outcome.data;
  const problems = (outcome.error?.issues ?? [])
    .map((issue) => `  ${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(`${label} is invalid:\n${problems}`);
}

export class JsonContentRepository implements ContentRepository {
  private cachedUi: UiConfig | undefined;
  private cachedBrands: BrandCatalog | undefined;
  private cachedPortfolio: Portfolio | undefined;

  constructor(private readonly sources: ContentSources = SHIPPED_SOURCES) {}

  ui(): UiConfig {
    this.cachedUi ??= unwrapOrThrow("ui.json", uiSchema.safeParse(this.sources.ui));
    return this.cachedUi;
  }

  brands(): BrandCatalog {
    this.cachedBrands ??= unwrapOrThrow("brands.json", brandsSchema.safeParse(this.sources.brands));
    return this.cachedBrands;
  }

  portfolio(): Portfolio {
    this.cachedPortfolio ??= unwrapOrThrow(
      "portfolio.json",
      createPortfolioSchema(this.ui()).safeParse(this.sources.portfolio),
    );
    return this.cachedPortfolio;
  }
}
