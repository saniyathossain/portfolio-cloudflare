/** Pure helpers for the shell's section navigation (the DOM-touching parts live in src/client/lib/shell). */
import { ShellAction } from "../enums/ShellAction";

export interface NavItemLike {
  readonly id: string;
  readonly action?: string | undefined;
}

export type NavTarget = { readonly kind: "modal" } | { readonly kind: "scroll"; readonly sectionId: string };

/** Nav items flagged `action: "modal"` open the contact modal instead of scrolling to their section. */
export function resolveNavTarget(item: NavItemLike): NavTarget {
  return item.action === "modal" ? { kind: "modal" } : { kind: "scroll", sectionId: item.id };
}

/** Document-space scroll offset that puts an element `offsetPx` below the top edge of the viewport. */
export function scrollTargetTop(elementTop: number, scrollY: number, offsetPx: number): number {
  return elementTop + scrollY - offsetPx;
}

/** "#experience" → "experience"; "" / "#" → "". */
export function sectionIdFromHash(hash: string): string {
  return hash.replace(/^#/, "");
}

/** Delegated-listener attributes (src/client/actions.ts) for a nav trigger: modal hand-off or section navigation. */
export function navTriggerAttributes(item: NavItemLike): Record<string, string> {
  const target = resolveNavTarget(item);
  return target.kind === "modal" ? { "data-action": ShellAction.NavModal } : { "data-nav-target": target.sectionId };
}
