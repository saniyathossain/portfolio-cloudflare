import { prefersReducedMotion } from "./constants";

const TRAVEL_MIN_DELTA_PX = 4;
const TRAVEL_FLAG_MS = 440;

interface PillBox {
  left: number;
  width: number;
  height: number;
}

interface PillState {
  activeIndex: number;
  hoverIndex: number;
  lastX: number | null;
  travelTimer: number;
  boxes: PillBox[];
  frame: number;
}

interface SectionTarget {
  element: HTMLElement;
  index: number;
}

/**
 * iOS Music-app droplet squash: whenever the lens changes destination, flag it "traveling" for the flight duration —
 * CSS squashes it mid-flight and the transition's own overshoot springs it back. Skipped for reduced motion.
 */
function flagTravel(nav: HTMLElement, state: PillState, left: number): void {
  if (!prefersReducedMotion() && state.lastX !== null && Math.abs(left - state.lastX) > TRAVEL_MIN_DELTA_PX) {
    nav.classList.add("is-traveling");
    clearTimeout(state.travelTimer);
    state.travelTimer = window.setTimeout(() => {
      nav.classList.remove("is-traveling");
    }, TRAVEL_FLAG_MS);
  }
}

/** Writes the lens position as CSS custom props from the cached boxes (no layout reads on the scroll-spy hot path). */
function placePill(nav: HTMLElement, state: PillState, index: number): void {
  const box = state.boxes[index];
  if (!box?.width) {
    nav.style.setProperty("--pill-o", "0");
    return;
  }
  flagTravel(nav, state, box.left);
  state.lastX = box.left;
  nav.style.setProperty("--pill-x", `${String(box.left)}px`);
  nav.style.setProperty("--pill-w", `${String(box.width)}px`);
  nav.style.setProperty("--pill-h", `${String(box.height)}px`);
  nav.style.setProperty("--pill-o", "1");
}

/** Music-app press: holding a tab inflates the lens under the finger/cursor; release springs it back (CSS). */
function bindPressEffect(nav: HTMLElement): void {
  nav.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target instanceof Element && event.target.closest("button")) nav.classList.add("is-pressing");
    },
    { passive: true },
  );
  for (const type of ["pointerup", "pointerleave", "pointercancel"]) {
    nav.addEventListener(
      type,
      () => {
        nav.classList.remove("is-pressing");
      },
      { passive: true },
    );
  }
}

function bindHover(buttons: HTMLButtonElement[], state: PillState, render: () => void): void {
  buttons.forEach((button, index) => {
    const hover = (): void => {
      state.hoverIndex = index;
      render();
    };
    const leave = (): void => {
      state.hoverIndex = -1;
      render();
    };
    button.addEventListener("mouseenter", hover);
    button.addEventListener("focus", hover);
    button.addEventListener("mouseleave", leave);
    button.addEventListener("blur", leave);
  });
}

/** Scroll-spy: mark the section crossing the upper-middle band as active. Modal items (no section) are skipped. */
function observeSections(ids: string[], setActive: (index: number) => void): void {
  const targets: SectionTarget[] = [];
  ids.forEach((id, index) => {
    const element = document.getElementById(id);
    if (element) targets.push({ element, index });
  });
  if (!("IntersectionObserver" in window) || targets.length === 0) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = targets.find((candidate) => candidate.element === entry.target);
        if (target) setActive(target.index);
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
  );
  targets.forEach((target) => {
    observer.observe(target.element);
  });
}

/**
 * Sliding "liquid" nav pill: rests under the active section, glides to the hovered/focused item. Position is written as
 * CSS custom props via el.style; the pill's own CSS transition does the gliding on the compositor.
 */
export function setupNavPill(root: ParentNode, ids: string[]): void {
  const nav = root.querySelector<HTMLElement>(".nav-desktop");
  if (!nav) return;
  const pill = nav.querySelector(".nav-desktop__pill");
  const buttons = Array.from(nav.querySelectorAll("button"));
  if (!pill || buttons.length === 0) return;
  const state: PillState = { activeIndex: 0, hoverIndex: -1, lastX: null, travelTimer: 0, boxes: [], frame: 0 };

  // Each button's box is cached once (load + resize) so place() never reads layout on the scroll-spy path. The first
  // read is deferred to a rAF: a synchronous read here is a new forced layout during the initial settle, which
  // measurably raised CLS variance on the hero copy.
  const collectBoxes = (): void => {
    state.boxes = buttons.map((button) => ({ left: button.offsetLeft, width: button.offsetWidth, height: button.offsetHeight }));
  };
  requestAnimationFrame(collectBoxes);
  window.addEventListener("resize", collectBoxes, { passive: true });

  bindPressEffect(nav);

  // Coalesced into a single rAF so a same-tick burst of triggers collapses into one read+write pair.
  const render = (): void => {
    cancelAnimationFrame(state.frame);
    state.frame = requestAnimationFrame(() => {
      placePill(nav, state, state.hoverIndex >= 0 ? state.hoverIndex : state.activeIndex);
    });
  };
  const setActive = (index: number): void => {
    state.activeIndex = index;
    buttons.forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === index);
    });
    if (state.hoverIndex < 0) render();
  };

  bindHover(buttons, state, render);
  observeSections(ids, setActive);
  window.addEventListener("resize", render);
  setActive(0);
}
