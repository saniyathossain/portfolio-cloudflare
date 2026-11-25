/**
 * Touch popover + partner-orb. Lives with the app bundle (not motion.js) so reduced-motion still gets tap-toggle and
 * dismissal. Fine-pointer devices keep CSS :hover / :focus-within.
 */
export function setupTouchReveal(): void {
  const touch = window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(hover: none)").matches;
  if (!touch) return;

  let openPopover: Element | null = null;
  let openOrb: Element | null = null;

  const closePopover = (): void => {
    if (!openPopover) return;
    openPopover.classList.remove("is-open");
    openPopover = null;
  };
  const closeOrb = (): void => {
    if (!openOrb) return;
    openOrb.classList.remove("is-open");
    openOrb = null;
  };
  const dismissAll = (): void => {
    closePopover();
    closeOrb();
  };

  const handleOrbTap = (event: Event, orb: Element): void => {
    if (openOrb === orb) {
      closeOrb();
      return; // second tap — allow navigation
    }
    event.preventDefault();
    closePopover();
    if (openOrb) openOrb.classList.remove("is-open");
    openOrb = orb;
    orb.classList.add("is-open");
  };

  const handlePopoverTap = (event: Event, popover: Element): void => {
    event.preventDefault();
    event.stopPropagation();
    closeOrb();
    if (openPopover === popover) {
      closePopover();
      return;
    }
    if (openPopover) openPopover.classList.remove("is-open");
    openPopover = popover;
    popover.classList.add("is-open");
  };

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const orb = target?.closest(".partner-orb");
    if (orb) {
      handleOrbTap(event, orb);
      return;
    }
    const popover = target?.closest(".popover");
    if (popover) handlePopoverTap(event, popover);
  });

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!openPopover && !openOrb) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (openPopover?.contains(target)) return;
      if (openOrb?.contains(target)) return;
      dismissAll();
    },
    true,
  );

  window.addEventListener("scroll", dismissAll, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") dismissAll();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") dismissAll();
  });
}
