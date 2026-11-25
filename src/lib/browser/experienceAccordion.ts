import {
  planRoleToggle,
  roleBodyId,
  roleIdFromPanelId,
  INITIAL_ROLE_STATE,
  type RoleAccordionState,
} from "../experienceAccordion";
import { animateHeight } from "./heightAnimation";

export interface ExperienceAccordionConfig {
  readonly openMs: number;
  readonly closeMs: number;
  readonly settleMarginMs: number;
  readonly openEasing: string;
  readonly closeEasing: string;
  readonly reducedMotionQuery: string;
}

interface RoleElements {
  readonly roleId: string;
  readonly row: HTMLElement;
  readonly panel: HTMLElement;
  readonly inner: HTMLElement | null;
}

const ROW_SELECTOR = ".exp-row";
const PERIOD_SELECTOR = ".exp-row__period";
const ITEM_SELECTOR = ".exp-item";
const PANEL_SELECTOR = ".exp-details";
const INNER_SELECTOR = ".exp-details__inner";
const CHEVRON_SELECTOR = ".exp-row__chev";
const OPEN_CLASS = "is-open";

function resolveRole(target: EventTarget | null): RoleElements | null {
  if (!(target instanceof Element)) return null;
  const row = target.closest<HTMLElement>(ROW_SELECTOR);
  const panel = row?.closest(ITEM_SELECTOR)?.querySelector<HTMLElement>(PANEL_SELECTOR);
  const roleId = panel ? roleIdFromPanelId(panel.id) : null;
  if (!row || !panel || roleId === null) return null;
  return { roleId, row, panel, inner: panel.querySelector<HTMLElement>(INNER_SELECTOR) };
}

/** Mirrors the open state onto the static, server-rendered markup (aria, class, inert, chevron). */
function applyOpenState(elements: RoleElements, isOpen: boolean): void {
  elements.row.setAttribute("aria-expanded", String(isOpen));
  elements.panel.classList.toggle(OPEN_CLASS, isOpen);
  if (isOpen) elements.panel.removeAttribute("inert");
  else elements.panel.setAttribute("inert", "");

  // The chevron is swapped for a fresh node (not class-toggled in place) so it does not animate a rotation — the
  // behaviour the page has always had.
  const chevron = elements.row.querySelector<SVGElement>(CHEVRON_SELECTOR);
  if (chevron) {
    const replacement = chevron.cloneNode(true) as SVGElement;
    replacement.classList.toggle(OPEN_CLASS, isOpen);
    chevron.replaceWith(replacement);
  }
}

/** Lazily mounts a role's body from its inert `<script type="text/html">` template (keeps the initial DOM light). */
function mountBody(elements: RoleElements): void {
  const template = document.getElementById(roleBodyId(elements.roleId));
  if (!template || !elements.inner) return;
  const host = document.createElement("div");
  host.innerHTML = template.textContent;
  elements.inner.insertBefore(host, template);
}

/**
 * Wires the static Experience markup: one delegated click handler, accordion state held per role id.
 * Returns the teardown function.
 */
export function attachExperienceAccordion(root: HTMLElement, config: ExperienceAccordionConfig): () => void {
  const states = new Map<string, RoleAccordionState>();
  const stateOf = (roleId: string): RoleAccordionState => states.get(roleId) ?? INITIAL_ROLE_STATE;

  const clearInlineHeight = (panel: HTMLElement): void => {
    panel.style.height = "";
    panel.style.overflow = "";
    panel.style.transition = "";
  };

  const open = (elements: RoleElements, needsBodyMount: boolean, animate: boolean): void => {
    if (needsBodyMount) mountBody(elements);
    applyOpenState(elements, true);
    if (!animate || !elements.inner) return;
    const { panel, inner } = elements;
    panel.style.overflow = "hidden";
    panel.style.height = "0px";
    animateHeight(panel, {
      toHeight: `${String(inner.scrollHeight)}px`,
      durationMs: config.openMs,
      easing: config.openEasing,
      settleMarginMs: config.settleMarginMs,
      onDone: () => {
        clearInlineHeight(panel);
      },
    });
  };

  const close = (elements: RoleElements, animate: boolean): void => {
    const { roleId, panel } = elements;
    const settle = (): void => {
      states.set(roleId, { ...stateOf(roleId), isOpen: false });
      applyOpenState(elements, false);
    };
    if (!animate) {
      settle();
      return;
    }
    panel.style.overflow = "hidden";
    panel.style.height = `${String(panel.scrollHeight)}px`;
    animateHeight(panel, {
      toHeight: "0px",
      durationMs: config.closeMs,
      easing: config.closeEasing,
      settleMarginMs: config.settleMarginMs,
      onDone: () => {
        settle();
        clearInlineHeight(panel);
      },
    });
  };

  const onClick = (event: MouseEvent): void => {
    // The period badge hosts its own tooltip: clicking it must not toggle the row (nor reach document handlers).
    if (event.target instanceof Element && event.target.closest(PERIOD_SELECTOR)) {
      event.stopPropagation();
      return;
    }
    const elements = resolveRole(event.target);
    if (!elements) return;

    const step = planRoleToggle(stateOf(elements.roleId));
    states.set(elements.roleId, step.next);
    // Reduced motion: same end state, no height animation. (The body must still be mounted on first open.)
    const animate = !window.matchMedia(config.reducedMotionQuery).matches && elements.inner !== null;
    if (step.direction === "open") {
      open(elements, step.needsBodyMount, animate);
    } else close(elements, animate);
  };

  root.addEventListener("click", onClick);
  return () => {
    root.removeEventListener("click", onClick);
  };
}
