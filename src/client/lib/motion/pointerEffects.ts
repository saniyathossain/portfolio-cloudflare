/**
 * Pointer-follow effects: magnetic CTAs, hero-card tilt and the `.spec` specular highlight.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import { motionEnvironment } from "./environment";
import { makeSpring } from "./spring";

export function magnetic(element: HTMLElement, strength = 0.14): void {
  const spring = makeSpring(
    element,
    (node, currentX, currentY) => {
      node.style.transform = `translate(${currentX.toFixed(2)}px,${currentY.toFixed(2)}px)`;
    },
    0.22,
  );
  element.addEventListener("pointermove", (event) => {
    const rect = element.getBoundingClientRect();
    const deltaX = event.clientX - (rect.left + rect.width / 2);
    const deltaY = event.clientY - (rect.top + rect.height / 2);
    spring.set(deltaX * strength, deltaY * strength);
  });
  element.addEventListener("pointerleave", () => {
    spring.set(0, 0);
  });
}

export function tilt(element: HTMLElement, maxDegrees = 5): void {
  const spring = makeSpring(
    element,
    (node, rotateY, rotateX) => {
      node.style.transform = `rotateY(${rotateY.toFixed(2)}deg) rotateX(${rotateX.toFixed(2)}deg)`;
    },
    0.18,
  );
  element.addEventListener("pointermove", (event) => {
    const rect = element.getBoundingClientRect();
    const fractionX = (event.clientX - rect.left) / rect.width - 0.5;
    const fractionY = (event.clientY - rect.top) / rect.height - 0.5;
    spring.set(fractionX * maxDegrees, -fractionY * maxDegrees);
  });
  element.addEventListener("pointerleave", () => {
    spring.set(0, 0);
  });
}

export function specular(): void {
  if (!motionEnvironment.canEnhance) return;
  let frame = 0;
  let pending: PointerEvent | null = null;
  let current: HTMLElement | null = null;

  function apply(): void {
    frame = 0;
    if (!pending || !current) return;
    const rect = current.getBoundingClientRect();
    const percentX = ((pending.clientX - rect.left) / rect.width) * 100;
    const percentY = ((pending.clientY - rect.top) / rect.height) * 100;
    current.style.setProperty("--px", `${percentX.toFixed(1)}%`);
    current.style.setProperty("--py", `${percentY.toFixed(1)}%`);
  }

  document.addEventListener(
    "pointermove",
    (event) => {
      const surface = event.target instanceof Element ? event.target.closest<HTMLElement>(".spec") : null;
      if (!surface) return;
      current = surface;
      pending = event;
      if (!frame) frame = requestAnimationFrame(apply);
    },
    { passive: true },
  );
}
