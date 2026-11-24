import type { z } from "zod";
import type { brandsSchema } from "../schemas/brandsSchema";
import type { iconsSchema } from "../schemas/iconsSchema";
import type { uiSchema } from "../schemas/uiSchema";

export type UiConfig = z.infer<typeof uiSchema>;
export type BrandTintConfig = UiConfig["brandTint"];
export type BrandCatalog = z.infer<typeof brandsSchema>;
export type BrandEntry = BrandCatalog["entries"][string];
export type IconCatalog = z.infer<typeof iconsSchema>;
