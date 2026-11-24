import ServicesSection from "./ServicesSection.astro";

/** Placeholder name (`<!--ASTRO:name-->` in src/legacy/index.html) → static section component. */
export const SECTION_COMPONENTS = {
  services: ServicesSection,
} as const;

export type SectionComponentName = keyof typeof SECTION_COMPONENTS;

export function isSectionComponentName(name: string): name is SectionComponentName {
  return name in SECTION_COMPONENTS;
}
