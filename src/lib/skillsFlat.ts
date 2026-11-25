/** Pure rules for the Tools & craft flat strip's mobile "View more" accordion. */

export interface SkillsFlatView {
  readonly isMobile: boolean;
  readonly isOpen: boolean;
}

/** Whether the pill at `pillIndex` is shown: everything on desktop or when open, else only the first `limit`. */
export function isPillVisible(pillIndex: number, view: SkillsFlatView, limit: number): boolean {
  if (!view.isMobile || view.isOpen) return true;
  return pillIndex < limit;
}

/** Pills hidden behind "View more" (mobile only). */
export function hiddenPillCount(totalPills: number, isMobile: boolean, limit: number): number {
  if (!isMobile) return 0;
  return Math.max(0, totalPills - limit);
}

/** The toggle exists on mobile when something is hidden, or while open (so it can collapse again). */
export function isToggleShown(view: SkillsFlatView, hiddenCount: number): boolean {
  return view.isMobile && (hiddenCount > 0 || view.isOpen);
}

export function mobileQuery(maxWidthPx: number): string {
  return `(max-width: ${maxWidthPx}px)`;
}
