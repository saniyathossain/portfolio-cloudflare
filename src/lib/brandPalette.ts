/** Brand tints as plain CSS classes, so no element needs an inline `style` attribute to carry its colour. */

/** `#7F88DC` → `bc-7f88dc` (the class the generated stylesheet defines for that colour). */
export function brandColorClass(color: string): string {
  return `bc-${color.replace(/^#/, "").toLowerCase()}`;
}

/** One `.bc-<hex>{--brand:#hex}` rule per distinct colour, sorted so the output is stable between builds. */
export function brandColorRules(colors: Iterable<string>): string {
  const distinct = [...new Set([...colors].map((color) => color.toLowerCase()))].sort();
  return `${distinct.map((color) => `.${brandColorClass(color)}{--brand:${color}}`).join("\n")}\n`;
}
