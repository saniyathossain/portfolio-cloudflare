import { JsonContentRepository } from "../repositories/ContentRepository";
import { BrandResolver } from "../services/BrandResolver";
import { IconService } from "../services/IconService";
import { PortfolioService } from "../services/PortfolioService";

/** Composition root (≈ Laravel's service container): the single place services are wired to JSON content. */
const contentRepository = new JsonContentRepository();
const ui = contentRepository.ui();

// Build-time variables: real environment first (Cloudflare Workers Builds), then Astro's .env handling for local builds.
const buildEnvironment = { ...import.meta.env, ...process.env };

export const portfolioService = new PortfolioService(contentRepository, () => new Date(), buildEnvironment);
export const portfolio = portfolioService.build();
export const iconService = new IconService(contentRepository.icons(), ui.fallbackIconName);
export const brandResolver = new BrandResolver(contentRepository.brands(), ui);
export const uiConfig = ui;
export const errorCatalog = contentRepository.errors();
