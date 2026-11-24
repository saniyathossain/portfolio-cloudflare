import type { z } from "zod";
import rawBrands from "../content/brands.json";
import rawErrors from "../content/errors.json";
import rawIcons from "../content/icons.json";
import rawUi from "../content/ui.json";
import rawPortfolio from "../../public/assets/data/portfolio.json";
import { brandsSchema } from "../schemas/brandsSchema";
import { errorsSchema } from "../schemas/errorsSchema";
import { iconsSchema } from "../schemas/iconsSchema";
import { createPortfolioSchema } from "../schemas/portfolioSchema";
import { uiSchema } from "../schemas/uiSchema";
import type { Portfolio } from "../types/Portfolio";
import type { BrandCatalog, ErrorCatalog, IconCatalog, UiConfig } from "../types/UiConfig";

/** The only module that reads content. Fails the build on malformed data instead of rendering a broken page. */
export interface ContentRepository {
  portfolio(): Portfolio;
  brands(): BrandCatalog;
  icons(): IconCatalog;
  errors(): ErrorCatalog;
  ui(): UiConfig;
}

export interface ContentSources {
  readonly portfolio: unknown;
  readonly brands: unknown;
  readonly icons: unknown;
  readonly errors: unknown;
  readonly ui: unknown;
}

const SHIPPED_SOURCES: ContentSources = {
  portfolio: rawPortfolio,
  brands: rawBrands,
  icons: rawIcons,
  errors: rawErrors,
  ui: rawUi,
};

/** Validates `source` against `schema`; the failure message lists every offending path. */
function parseOrThrow<TSchema extends z.ZodType>(label: string, schema: TSchema, source: unknown): z.infer<TSchema> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  const problems = result.error.issues
    .map((issue) => `  ${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(`${label} is invalid:\n${problems}`);
}

export class JsonContentRepository implements ContentRepository {
  private cachedUi: UiConfig | undefined;
  private cachedBrands: BrandCatalog | undefined;
  private cachedIcons: IconCatalog | undefined;
  private cachedErrors: ErrorCatalog | undefined;
  private cachedPortfolio: Portfolio | undefined;

  constructor(private readonly sources: ContentSources = SHIPPED_SOURCES) {}

  ui(): UiConfig {
    this.cachedUi ??= parseOrThrow("ui.json", uiSchema, this.sources.ui);
    return this.cachedUi;
  }

  brands(): BrandCatalog {
    this.cachedBrands ??= parseOrThrow("brands.json", brandsSchema, this.sources.brands);
    return this.cachedBrands;
  }

  icons(): IconCatalog {
    this.cachedIcons ??= parseOrThrow("icons.json", iconsSchema, this.sources.icons);
    return this.cachedIcons;
  }

  errors(): ErrorCatalog {
    this.cachedErrors ??= parseOrThrow("errors.json", errorsSchema, this.sources.errors);
    return this.cachedErrors;
  }

  portfolio(): Portfolio {
    this.cachedPortfolio ??= parseOrThrow("portfolio.json", createPortfolioSchema(this.ui()), this.sources.portfolio);
    return this.cachedPortfolio;
  }
}
