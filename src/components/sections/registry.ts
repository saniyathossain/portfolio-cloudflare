import AboutSection from "./AboutSection.astro";
import ArrowIconMd from "./ArrowIconMd.astro";
import LoaderBrand from "./LoaderBrand.astro";
import LoaderTagline from "./LoaderTagline.astro";
import BackToTopIsland from "./BackToTopIsland.astro";
import CreateBandSection from "./CreateBandSection.astro";
import EditorialIsland from "./EditorialIsland.astro";
import EducationSection from "./EducationSection.astro";
import ExperienceSection from "./ExperienceSection.astro";
import FooterSection from "./FooterSection.astro";
import LiveDatesScript from "./LiveDatesScript.astro";
import HeaderClockIsland from "./HeaderClockIsland.astro";
import HeroCardsIsland from "./HeroCardsIsland.astro";
import NavDesktopItems from "./NavDesktopItems.astro";
import ContactModalIsland from "./ContactModalIsland.astro";
import NavOverlayIsland from "./NavOverlayIsland.astro";
import PartnersBlock from "./PartnersBlock.astro";
import ServicesSection from "./ServicesSection.astro";
import SkillsSection from "./SkillsSection.astro";
import StatsSection from "./StatsSection.astro";

/** Placeholder name (`<!--ASTRO:name-->` in src/legacy/index.html) → static section component. */
export const SECTION_COMPONENTS = {
  navDesktopItems: NavDesktopItems,
  arrowIconMd: ArrowIconMd,
  loaderBrand: LoaderBrand,
  loaderTagline: LoaderTagline,
  partners: PartnersBlock,
  about: AboutSection,
  createBand: CreateBandSection,
  services: ServicesSection,
  experience: ExperienceSection,
  skills: SkillsSection,
  editorial: EditorialIsland,
  stats: StatsSection,
  education: EducationSection,
  footer: FooterSection,
  liveDatesScript: LiveDatesScript,
  backToTop: BackToTopIsland,
  headerClock: HeaderClockIsland,
  navOverlay: NavOverlayIsland,
  contactModal: ContactModalIsland,
  heroCards: HeroCardsIsland,
} as const;

export type SectionComponentName = keyof typeof SECTION_COMPONENTS;

export function isSectionComponentName(name: string): name is SectionComponentName {
  return name in SECTION_COMPONENTS;
}
