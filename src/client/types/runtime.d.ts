/**
 * Shapes shared between the browser bundles. Each bundle declares the `window` members it publishes through
 * `declare global { interface Window { … } }`; only types used by more than one file live here.
 */

/** The word-split / blur crossfade helpers blur-reveal exposes on `window.blurReveal` for late-rendered elements. */
export interface BlurRevealApi {
  split(element: HTMLElement): void;
  reveal(element: HTMLElement): void;
  reduced: boolean;
}
