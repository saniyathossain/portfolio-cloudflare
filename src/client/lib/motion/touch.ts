/**
 * Touch feedback: Liquid Glass press bloom on `.menu-btn`, and tap-to-zoom for the header clock face.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */

/**
 * iOS 26 "Liquid Glass" touch feedback for .menu-btn (header Menu button + the overlay's Close button, same shared
 * control) — a soft blob blooms from the exact press point and springs back out on release (CSS: .menu-btn__ripple,
 * driven by --tx/--ty here). Pointer Events cover mouse/touch/pen in one listener; unconditional (not gated by
 * canEnhance) since touch is the primary target, not desktop hover.
 */
export function liquidTouch(): void {
  const setPosition = (element: HTMLElement, event: PointerEvent): void => {
    const rect = element.getBoundingClientRect();
    const percentX = ((event.clientX - rect.left) / rect.width) * 100;
    const percentY = ((event.clientY - rect.top) / rect.height) * 100;
    element.style.setProperty("--tx", `${percentX.toFixed(1)}%`);
    element.style.setProperty("--ty", `${percentY.toFixed(1)}%`);
  };
  document.querySelectorAll<HTMLElement>(".menu-btn").forEach((button) => {
    if (!button.querySelector(".menu-btn__ripple")) return;
    // Press bloom only (no cursor-following hover glow — removed by request): the ripple springs from the exact press
    // point, set here on pointerdown.
    button.addEventListener(
      "pointerdown",
      (event) => {
        setPosition(button, event);
        button.classList.add("is-pressed");
      },
      { passive: true },
    );
    const release = (): void => {
      button.classList.remove("is-pressed");
    };
    button.addEventListener("pointerup", release, { passive: true });
    button.addEventListener("pointerleave", release, { passive: true });
    button.addEventListener("pointercancel", release, { passive: true });
  });
}

/**
 * Touch devices have no :hover, so the clock's grow-on-hover never fires. Tapping the analog face toggles .is-zoomed
 * (the same enlarged state the CSS applies on desktop hover); tapping anywhere else closes it. Gated on the pointer that
 * actually fired, not a media query: a mouse pointerup is left to the CSS :hover path (so a desktop click never sticks
 * the zoom), while touch/pen taps toggle it. This is what makes the grow work on phones, where there is no :hover.
 */
export function clockTapZoom(): void {
  const face = document.querySelector<HTMLElement>(".clock-face");
  if (!face) return;
  const header = document.querySelector(".site-header");
  const setZoom = (on: boolean): void => {
    face.classList.toggle("is-zoomed", on);
    // Flag the header too: on phones the enlarged face would overlap the brand mark to its left, so CSS fades the
    // brand out while zoomed (see .site-header.clock-zoomed .brand-btn).
    if (header) header.classList.toggle("clock-zoomed", on);
  };
  face.addEventListener("pointerup", (event) => {
    if (event.pointerType === "mouse") return;
    event.stopPropagation();
    setZoom(!face.classList.contains("is-zoomed"));
  });
  document.addEventListener(
    "pointerup",
    (event) => {
      if (event.pointerType === "mouse") return;
      const insideFace = event.target instanceof Element && event.target.closest(".clock-face") !== null;
      if (!insideFace) setZoom(false);
    },
    { passive: true },
  );
}
