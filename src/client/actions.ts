/**
 * Delegated UI actions for the shell (menu, contact modal, section navigation, hash navigation) — replaces the
 * Alpine handlers openMenu/closeMenu/openModal/closeModal/navGo/scrollTo (docs/aidlc/55). One document-level click
 * listener reads `data-action` / `data-nav-target` / `data-scroll-target` attributes, so triggers work before any
 * island has hydrated; state lives in src/stores/ui.ts and the Preact islands render it.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 */
import { shell } from "../content/ui.json";
import { scrollToTop } from "../lib/browser/scroll";
import { shellStore, type ShellState } from "../stores/ui";
import {
  closeMenu,
  closeModal,
  handOffToModal,
  menuToModal,
  navigateToSection,
  openMenu,
  openModal,
  toggleMenu,
} from "./lib/shell/controller";
import { scrollToSection, setupHashNavigation } from "./lib/shell/navigation";

const ACTIONS: Readonly<Record<string, () => void>> = {
  "open-modal": openModal,
  "open-menu": openMenu,
  "close-menu": closeMenu,
  "toggle-menu": toggleMenu,
  "close-modal": closeModal,
  "nav-modal": handOffToModal,
  "menu-to-modal": menuToModal,
  "scroll-top": scrollToTop,
};

const TRIGGER_SELECTOR = "[data-action],[data-nav-target],[data-scroll-target]";
const BACKDROP_ACTION = "close-modal-backdrop";

function handleClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;
  const trigger = event.target.closest<HTMLElement>(TRIGGER_SELECTOR);
  if (!trigger) return;
  const { action, navTarget, scrollTarget } = trigger.dataset;
  if (action === BACKDROP_ACTION) {
    // Backdrop click closes the modal; clicks that bubble up from inside the panel do not.
    if (event.target === trigger) closeModal();
    return;
  }
  if (action) ACTIONS[action]?.();
  else if (navTarget) navigateToSection(navTarget);
  else if (scrollTarget) scrollToSection(scrollTarget);
}

/** Escape closes the modal, else the menu. */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;
  const { menuOpen, modalOpen } = shellStore.get();
  if (modalOpen) closeModal();
  else if (menuOpen) closeMenu();
}

/** Keeps the header Menu button (outside the overlay island) in sync with the store. */
function syncMenuButton({ menuOpen }: ShellState): void {
  const button = document.querySelector<HTMLElement>(".site-header .menu-btn[data-action='toggle-menu']");
  if (!button) return;
  button.setAttribute("aria-expanded", String(menuOpen));
  button.setAttribute("aria-label", menuOpen ? shell.menuButton.closeAriaLabel : shell.menuButton.openAriaLabel);
  const label = button.querySelector("[data-menu-label]");
  if (label) label.textContent = menuOpen ? shell.menuButton.closeLabel : shell.menuButton.openLabel;
}

document.addEventListener("click", handleClick);
window.addEventListener("keydown", handleKeydown);
shellStore.subscribe(syncMenuButton);
setupHashNavigation();
