/** Accordion bookkeeping for the Experience section — pure, so it can be unit-tested without a DOM. */

const ROLE_PANEL_ID_PREFIX = "exp-panel-";
const ROLE_BODY_ID_PREFIX = "exp-body-";

export interface RoleAccordionState {
  /** True from the start of an open until the END of a close animation (the row stays "expanded" while closing). */
  readonly isOpen: boolean;
  /** Sticky: true once the body has been mounted; never reverts on re-collapse. */
  readonly hasOpenedOnce: boolean;
}

export const INITIAL_ROLE_STATE: RoleAccordionState = { isOpen: false, hasOpenedOnce: false };

export interface RoleToggleStep {
  /** The state to apply immediately. */
  readonly next: RoleAccordionState;
  readonly direction: "open" | "close";
  /** The body is not mounted yet and must be before the open height is measured. */
  readonly needsBodyMount: boolean;
}

/** What one click on a role row does, given its current state. */
export function planRoleToggle(current: RoleAccordionState): RoleToggleStep {
  if (current.isOpen) return { next: current, direction: "close", needsBodyMount: false };
  return {
    next: { isOpen: true, hasOpenedOnce: true },
    direction: "open",
    needsBodyMount: !current.hasOpenedOnce,
  };
}

/** Role id out of a panel element id (`exp-panel-<roleId>`), or null when the id is not a role panel. */
export function roleIdFromPanelId(panelId: string): string | null {
  if (!panelId.startsWith(ROLE_PANEL_ID_PREFIX)) return null;
  const roleId = panelId.slice(ROLE_PANEL_ID_PREFIX.length);
  return roleId === "" ? null : roleId;
}

export function roleBodyId(roleId: string): string {
  return `${ROLE_BODY_ID_PREFIX}${roleId}`;
}
