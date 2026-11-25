function noop(): void {
  /* default: no warp timer to cancel */
}

/**
 * Battery optimisation: pause every always-on decorative animation (aurora drift, .beam rotations, brand sheen — see
 * the `html.is-idle` rules in styles.css) whenever the page is hidden OR the window loses focus, and resume on return.
 * (The aurora *canvas* pauses itself in aurora.ts; this covers the CSS-driven animations.)
 */
export function setupIdlePause(cancelWarpTimer: () => void = noop): void {
  const root = document.documentElement;
  const idle = (): void => {
    root.classList.add("is-idle");
    // `is-idle` only pauses @keyframes-driven decorations (browsers can't pause a CSS transition). A transition
    // mid-flight when the tab loses focus would freeze at whatever value it reached — for the #main liquid-warp pulse
    // that reads as a rendering glitch — so settle it to its resting state immediately.
    const main = document.getElementById("main");
    if (main?.classList.contains("is-liquid-warp")) {
      cancelWarpTimer();
      main.classList.remove("is-liquid-warp");
    }
  };
  const active = (): void => {
    root.classList.remove("is-idle");
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) idle();
    else active();
  });
  window.addEventListener("blur", idle);
  window.addEventListener("focus", active);
}
