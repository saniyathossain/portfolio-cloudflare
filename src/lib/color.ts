export interface Rgb {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

export interface Hsl {
  readonly hue: number;
  readonly saturation: number;
  readonly lightness: number;
}

const FALLBACK_RGB: Rgb = { red: 0.42, green: 0.42, blue: 0.42 };

export function hexToRgb(hex: string): Rgb {
  const digits = hex.replace("#", "");
  if (digits.length !== 6) return FALLBACK_RGB;
  return {
    red: parseInt(digits.slice(0, 2), 16) / 255,
    green: parseInt(digits.slice(2, 4), 16) / 255,
    blue: parseInt(digits.slice(4, 6), 16) / 255,
  };
}

function channelToHex(channel: number): string {
  const byteValue = Math.round(Math.max(0, Math.min(255, channel * 255)));
  return byteValue.toString(16).padStart(2, "0");
}

export function rgbToHex(rgb: Rgb): string {
  return `#${channelToHex(rgb.red)}${channelToHex(rgb.green)}${channelToHex(rgb.blue)}`;
}

export function mixRgb(from: Rgb, to: Rgb, amount: number): Rgb {
  return {
    red: from.red + (to.red - from.red) * amount,
    green: from.green + (to.green - from.green) * amount,
    blue: from.blue + (to.blue - from.blue) * amount,
  };
}

function hueOfMaxChannel(rgb: Rgb, max: number, delta: number): number {
  if (max === rgb.red) return ((rgb.green - rgb.blue) / delta + (rgb.green < rgb.blue ? 6 : 0)) / 6;
  if (max === rgb.green) return ((rgb.blue - rgb.red) / delta + 2) / 6;
  return ((rgb.red - rgb.green) / delta + 4) / 6;
}

export function rgbToHsl(rgb: Rgb): Hsl {
  const max = Math.max(rgb.red, rgb.green, rgb.blue);
  const min = Math.min(rgb.red, rgb.green, rgb.blue);
  const lightness = (max + min) / 2;
  if (max === min) return { hue: 0, saturation: 0, lightness };
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  return { hue: hueOfMaxChannel(rgb, max, delta) * 360, saturation, lightness };
}

function hueSegmentToChannel(low: number, high: number, hueFraction: number): number {
  let wrapped = hueFraction;
  if (wrapped < 0) wrapped += 1;
  if (wrapped > 1) wrapped -= 1;
  if (wrapped < 1 / 6) return low + (high - low) * 6 * wrapped;
  if (wrapped < 1 / 2) return high;
  if (wrapped < 2 / 3) return low + (high - low) * (2 / 3 - wrapped) * 6;
  return low;
}

export function hslToRgb(hsl: Hsl): Rgb {
  const hueFraction = (((hsl.hue % 360) + 360) % 360) / 360;
  if (hsl.saturation === 0) return { red: hsl.lightness, green: hsl.lightness, blue: hsl.lightness };
  const high =
    hsl.lightness < 0.5
      ? hsl.lightness * (1 + hsl.saturation)
      : hsl.lightness + hsl.saturation - hsl.lightness * hsl.saturation;
  const low = 2 * hsl.lightness - high;
  return {
    red: hueSegmentToChannel(low, high, hueFraction + 1 / 3),
    green: hueSegmentToChannel(low, high, hueFraction),
    blue: hueSegmentToChannel(low, high, hueFraction - 1 / 3),
  };
}

function linearizeChannel(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance → a readable foreground for a coloured chip. */
export function readableForeground(hex: string): "#111111" | "#ffffff" {
  const rgb = hexToRgb(hex);
  const luminance =
    0.2126 * linearizeChannel(rgb.red) + 0.7152 * linearizeChannel(rgb.green) + 0.0722 * linearizeChannel(rgb.blue);
  return luminance > 0.5 ? "#111111" : "#ffffff";
}
