import { useEffect } from "preact/hooks";
import { attachExperienceAccordion, type ExperienceAccordionConfig } from "../lib/browser/experienceAccordion";

interface ExperienceAccordionProps {
  /** Id of the section that holds the statically rendered rows and panels. */
  readonly sectionId: string;
  readonly config: ExperienceAccordionConfig;
}

/**
 * Behaviour-only island for the Experience accordion. The rows, panels, pills and tenure popovers are rendered once by
 * Astro and stay in the DOM untouched (so `reveal.ts`, `motion.ts` and the pill-reflow observers keep stable node
 * references); this island owns the open/close state and the height animation. It renders no markup of its own.
 */
export default function ExperienceAccordion({ sectionId, config }: ExperienceAccordionProps) {
  useEffect(() => {
    const section = document.getElementById(sectionId);
    if (!section) return undefined;
    return attachExperienceAccordion(section, config);
  }, [sectionId, config]);

  return null;
}
