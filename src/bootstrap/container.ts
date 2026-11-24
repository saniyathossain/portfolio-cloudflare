import { JsonContentRepository } from "../repositories/ContentRepository";
import { BrandResolver } from "../services/BrandResolver";
import { IconService } from "../services/IconService";
import { PortfolioService } from "../services/PortfolioService";

/** Composition root (≈ Laravel's service container): the single place services are wired to JSON content. */
const contentRepository = new JsonContentRepository();
const ui = contentRepository.ui();

export const portfolio = new PortfolioService(contentRepository).build();
export const iconService = new IconService(contentRepository.icons(), ui.fallbackIconName);
export const brandResolver = new BrandResolver(contentRepository.brands(), ui);
export const uiConfig = ui;
