import AboutSection from "./AboutSection.astro";
import CreateBandSection from "./CreateBandSection.astro";
import EducationSection from "./EducationSection.astro";
import ExperienceSection from "./ExperienceSection.astro";
import FooterSection from "./FooterSection.astro";
import LiveDatesScript from "./LiveDatesScript.astro";
import NavDesktopItems from "./NavDesktopItems.astro";
import NavOverlayItems from "./NavOverlayItems.astro";
import PartnersBlock from "./PartnersBlock.astro";
import ServicesSection from "./ServicesSection.astro";
import SkillsSection from "./SkillsSection.astro";
import StatsSection from "./StatsSection.astro";

/** Placeholder name (`<!--ASTRO:name-->` in src/legacy/index.html) → static section component. */
export const SECTION_COMPONENTS = {
  navDesktopItems: NavDesktopItems,
  partners: PartnersBlock,
  about: AboutSection,
  createBand: CreateBandSection,
  services: ServicesSection,
  experience: ExperienceSection,
  skills: SkillsSection,
  stats: StatsSection,
  education: EducationSection,
  footer: FooterSection,
  navOverlayItems: NavOverlayItems,
  liveDatesScript: LiveDatesScript,
} as const;

export type SectionComponentName = keyof typeof SECTION_COMPONENTS;

export function isSectionComponentName(name: string): name is SectionComponentName {
  return name in SECTION_COMPONENTS;
}
