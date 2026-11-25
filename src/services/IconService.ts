import type { IconCatalog } from "../types/UiConfig";

const BASE_CLASS = "ui-icon";
const SOCIAL_CLASS = "ui-icon--social";
const FILLED_CLASS = "ui-icon--filled";
const STROKE_ATTRIBUTES = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const DEFAULT_STROKE_WIDTH_ATTRIBUTE = 'stroke-width="1.75"';

type IconTarget = string | { readonly social: string };

/** Renders catalogue icons (Lucide strokes + Simple Icons socials) as inline SVG markup. */
export class IconService {
  constructor(
    private readonly catalog: IconCatalog,
    private readonly fallbackName: string,
  ) {}

  /** Same output the legacy `window.iconSvg(name, className)` produced. */
  render(name: string, className = ""): string {
    const target = this.resolve(name);
    if (typeof target === "object") return this.renderSocial(target.social, className);
    return this.renderLucide(target, className);
  }

  private resolve(name: string): IconTarget {
    const alias = this.catalog.aliases[name];
    if (alias) return alias;
    if (name in this.catalog.lucide) return name;
    return this.catalog.aliases[this.fallbackName] ?? this.fallbackName;
  }

  private withBaseClass(className: string, isSocial: boolean): string {
    const trimmed = className.trim();
    let result = this.ensureBaseClass(trimmed);
    if (isSocial && !result.includes(SOCIAL_CLASS)) result += ` ${SOCIAL_CLASS}`;
    return result.trim();
  }

  private ensureBaseClass(trimmedClassName: string): string {
    if (trimmedClassName.includes(BASE_CLASS)) return trimmedClassName;
    return trimmedClassName === "" ? BASE_CLASS : `${trimmedClassName} ${BASE_CLASS}`;
  }

  private isFilled(inner: string): boolean {
    return inner.includes('fill="currentColor"') && !inner.includes('stroke="currentColor"');
  }

  private renderLucide(iconId: string, className: string): string {
    const inner = this.catalog.lucide[iconId];
    if (inner === undefined) {
      return iconId === this.fallbackName ? "" : this.renderLucide(this.fallbackName, className);
    }
    const classes = this.withBaseClass(className, false);
    if (this.isFilled(inner)) {
      const filledClasses = classes.includes(FILLED_CLASS) ? classes : `${classes} ${FILLED_CLASS}`;
      return `<svg class="${filledClasses}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${inner}</svg>`;
    }
    const strokeAttributes = inner.includes('stroke-width="')
      ? ` ${STROKE_ATTRIBUTES}`
      : ` fill="none" stroke="currentColor" ${DEFAULT_STROKE_WIDTH_ATTRIBUTE} stroke-linecap="round" stroke-linejoin="round"`;
    return `<svg class="${classes}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"${strokeAttributes} aria-hidden="true">${inner}</svg>`;
  }

  private renderSocial(socialId: string, className: string): string {
    const inner = this.catalog.social[socialId];
    if (inner === undefined) return this.renderLucide(this.fallbackName, className);
    const classes = this.withBaseClass(className, true);
    const paths = inner.includes('fill="') ? inner : inner.replace(/<path /g, '<path fill="currentColor" ');
    return `<svg class="${classes}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${paths}</svg>`;
  }
}
