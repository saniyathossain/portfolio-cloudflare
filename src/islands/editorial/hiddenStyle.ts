import type { CSSProperties } from "preact";

/** What Alpine's `x-show` wrote when false; `undefined` (no style attribute) when shown. */
const HIDDEN_STYLE: CSSProperties = { display: "none" };

export function hiddenUnless(isShown: boolean): CSSProperties | undefined {
  return isShown ? undefined : HIDDEN_STYLE;
}
