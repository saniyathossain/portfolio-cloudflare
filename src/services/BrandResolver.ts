import { deriveUiTint } from "../lib/brandTint";
import { readableForeground } from "../lib/color";
import type { StackBrand } from "../types/StackBrand";
import type { BrandCatalog, UiConfig } from "../types/UiConfig";

/** Turns a stack name into everything a pill needs. The catalogue and tint rules are injected (from JSON). */
export class BrandResolver {
  constructor(
    private readonly catalog: BrandCatalog,
    private readonly ui: Pick<UiConfig, "brandTint" | "brandIconBasePath">,
  ) {}

  resolve(stackName: string): StackBrand {
    const lookupKey = stackName.toLowerCase().trim();
    const entry = this.catalog.entries[lookupKey];
    const rawColor = entry?.color ?? this.ui.brandTint.unknownBrandColor;
    const color = entry?.tint ?? deriveUiTint(rawColor, this.ui.brandTint);
    return {
      label: stackName,
      color,
      rawColor,
      iconSrc: entry ? `${this.ui.brandIconBasePath}/${entry.icon}.svg` : null,
      monogram: (stackName.trim().charAt(0) || "?").toUpperCase(),
      foreground: readableForeground(color),
    };
  }
}
