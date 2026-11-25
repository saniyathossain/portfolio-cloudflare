import type { BrandTintConfig } from "../types/UiConfig";
import { hexToRgb, hslToRgb, mixRgb, rgbToHex, rgbToHsl } from "./color";

interface SaturationAndLightness {
  readonly saturation: number;
  readonly lightness: number;
}

function tuneSaturationAndLightness(
  saturation: number,
  lightness: number,
  config: BrandTintConfig,
): SaturationAndLightness {
  const { darkLift, lightDampen, midTone } = config;
  if (lightness < darkLift.belowLightness) {
    return { saturation: Math.max(saturation, darkLift.minSaturation), lightness: darkLift.lightness };
  }
  if (lightness > lightDampen.aboveLightness) {
    return {
      saturation: Math.min(Math.max(saturation, lightDampen.minSaturation), lightDampen.maxSaturation),
      lightness: lightDampen.lightness,
    };
  }
  return {
    saturation: Math.min(saturation * midTone.saturationGain + midTone.saturationBoost, midTone.maxSaturation),
    lightness: Math.min(Math.max(lightness, midTone.minLightness), midTone.maxLightness),
  };
}

/**
 * Pill tints need more mid-light chroma than raw logo hexes (many marks are near-black or neon-yellow):
 * lift/dampen in HSL, then nudge toward the site's warm beige + sea-teal + Tahoe violet.
 * Every threshold and anchor colour comes from ui.json → brandTint.
 */
export function deriveUiTint(logoHex: string, config: BrandTintConfig): string {
  const logoRgb = hexToRgb(logoHex);
  const { hue, saturation, lightness } = rgbToHsl(logoRgb);
  const teal = hexToRgb(config.anchors.teal);
  if (saturation < config.mutedBelowSaturation || lightness < config.darkBelowLightness) {
    return rgbToHex(mixRgb(logoRgb, teal, config.darkTealMix));
  }

  const tuned = tuneSaturationAndLightness(saturation, lightness, config);
  const tunedRgb = hslToRgb({ hue, saturation: tuned.saturation, lightness: tuned.lightness });
  const towardTaupe = mixRgb(tunedRgb, hexToRgb(config.anchors.taupe), config.taupeMix);
  return rgbToHex(mixRgb(towardTaupe, hexToRgb(config.anchors.violet), config.violetMix));
}
