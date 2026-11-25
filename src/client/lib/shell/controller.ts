import { shell } from "../../../content/ui.json";
import { shellStore } from "../../../stores/ui";
import { scrollToSection } from "./navigation";
import { applyScrollLock } from "./scrollLock";

let closeSyncBound = false;

/**
 * Lays the overlay's Close button exactly over the header's Menu button so the drawer reads as the same control
 * morphing in place. The Menu button's position shifts between breakpoints, so mirror its live rect.
 */
function syncCloseButton(): void {
  const menuButton = document.querySelector(".site-header .menu-btn");
  const closeButton = document.querySelector<HTMLElement>(".nav-overlay__close");
  if (!menuButton || !closeButton) return;
  const rect = menuButton.getBoundingClientRect();
  if (!rect.width) return;
  Object.assign(closeButton.style, {
    position: "fixed",
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
  });
}

export function openMenu(): void {
  shellStore.setKey("menuOpen", true);
  shellStore.setKey("menuMounted", true);
  applyScrollLock(true);
  // Double rAF lets the overlay lay out first; a one-time resize hook keeps it aligned if the viewport changes.
  requestAnimationFrame(() => {
    requestAnimationFrame(syncCloseButton);
  });
  if (closeSyncBound) return;
  closeSyncBound = true;
  window.addEventListener(
    "resize",
    () => {
      if (shellStore.get().menuOpen) syncCloseButton();
    },
    { passive: true },
  );
}

export function closeMenu(): void {
  shellStore.setKey("menuOpen", false);
  applyScrollLock(false);
}

export function toggleMenu(): void {
  if (shellStore.get().menuOpen) closeMenu();
  else openMenu();
}

export function openModal(): void {
  shellStore.setKey("modalOpen", true);
  shellStore.setKey("modalMounted", true);
  applyScrollLock(true);
}

export function closeModal(): void {
  shellStore.setKey("modalOpen", false);
  applyScrollLock(false);
}

/**
 * Menu -> modal hand-off. Deliberately NOT closeMenu()+openModal() (each calls applyScrollLock): both want scroll
 * locked, so unlocking and re-locking shortly after would race — the re-lock could capture scrollY before the unlock's
 * restore landed. Keeping the lock continuously active removes the race outright.
 */
export function handOffToModal(): void {
  shellStore.setKey("menuOpen", false);
  shellStore.setKey("modalMounted", true);
  setTimeout(() => {
    shellStore.setKey("modalOpen", true);
  }, shell.menuHandoffMs);
}

/** Closes the menu (a no-op unlock when it was never open), then smooth-scrolls to the section. */
export function navigateToSection(sectionId: string): void {
  closeMenu();
  setTimeout(() => {
    scrollToSection(sectionId);
  }, shell.navScrollMs);
}

/** The overlay's "Get in touch" link: close the menu, then open the modal (same synchronous sequence as legacy). */
export function menuToModal(): void {
  closeMenu();
  openModal();
}
