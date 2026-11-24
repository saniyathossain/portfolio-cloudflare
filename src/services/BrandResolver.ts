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

  /**
   * Drops stack names whose icon already appears earlier in the same list, so two pills never show the same logo
   * (e.g. "Laravel Horizon" after "Laravel", "RediSearch" after "Redis" — each is a part of the first and has no
   * logo of its own). Names without an icon are always kept: their monogram is unique to them.
   */
  distinctByIcon(stackNames: readonly string[]): string[] {
    const seenIcons = new Set<string>();
    return stackNames.filter((stackName) => {
      const { iconSrc } = this.resolve(stackName);
      if (iconSrc === null) return true;
      if (seenIcons.has(iconSrc)) return false;
      seenIcons.add(iconSrc);
      return true;
    });
  }
}
