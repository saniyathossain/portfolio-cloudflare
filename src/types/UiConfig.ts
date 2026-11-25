import type { z } from "zod";
import type { brandsSchema } from "../schemas/brandsSchema";
import type { errorsSchema } from "../schemas/errorsSchema";
import type { iconsSchema } from "../schemas/iconsSchema";
import type { uiSchema } from "../schemas/uiSchema";

export type UiConfig = z.infer<typeof uiSchema>;
export type BrandTintConfig = UiConfig["brandTint"];
export type BrandCatalog = z.infer<typeof brandsSchema>;
export type IconCatalog = z.infer<typeof iconsSchema>;
export type ErrorCatalog = z.infer<typeof errorsSchema>;
