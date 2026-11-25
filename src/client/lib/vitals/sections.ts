const HEADER_SELECTOR = ".site-header";
const FOOTER_SELECTOR = ".site-footer";
const SECTION_SELECTOR = "section[id]";
const FOOTER_SECTION = "contact";
const HEADER_SECTION = "header";
const FALLBACK_SECTION = "page";
const MAX_CLASS_CHARS = 2;

/** The page section a node lives in: `header`, a `<section id>`, the footer as `contact`, or `page`. */
export function sectionOf(node: Node | null | undefined): string {
  const element = node instanceof Element ? node : node?.parentElement;
  if (!element) return FALLBACK_SECTION;
  if (element.closest(HEADER_SELECTOR)) return HEADER_SECTION;
  const section = element.closest(SECTION_SELECTOR);
  if (section) return section.id;
  if (element.closest(FOOTER_SELECTOR)) return FOOTER_SECTION;
  return FALLBACK_SECTION;
}

/** A short, content-free description of an element: `img#heroBaseImg`, `p.hero__wm`, `h1`. */
export function describeElement(node: Node | null | undefined): string {
  if (!(node instanceof Element)) return "";
  const tag = node.tagName.toLowerCase();
  if (node.id) return `${tag}#${node.id}`;
  const classes =
    typeof node.className === "string" ? node.className.split(/\s+/).filter(Boolean).slice(0, MAX_CLASS_CHARS) : [];
  return classes.length > 0 ? `${tag}.${classes.join(".")}` : tag;
}

/** The `<section id>` elements worth timing (everything `sectionOf` can return except header / contact / page). */
export function observedSections(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(SECTION_SELECTOR));
}
