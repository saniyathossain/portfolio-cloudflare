/**
 * Page effects — the non-stateful behaviours that used to be started by the Alpine root: sliding nav pill + scroll-spy,
 * idle pause of decorative animation, hero-photo contrast probe, the header's `is-scrolled` state and the tap-to-reveal
 * brand pills on touch devices. Plain typed module, no framework (docs/aidlc/55, 61).
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import { behavior } from "../content/ui.json";
import { setupHeaderScrolled } from "./lib/effects/headerScrolled";
import { setupHeroContrast } from "./lib/effects/heroContrast";
import { setupIdlePause } from "./lib/effects/idlePause";
import { setupNavPill } from "./lib/effects/navPill";
import { setupTouchReveal } from "./lib/effects/touchReveal";

const NAV_TARGET_SELECTOR = ".nav-desktop [data-nav-target]";

/** Section ids in nav order, read from the server-rendered desktop nav (the single source of the order). */
function navSectionIds(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>(NAV_TARGET_SELECTOR))
    .map((item) => item.dataset["navTarget"] ?? "")
    .filter((id) => id !== "");
}

function start(): void {
  setupHeroContrast();
  setupNavPill(document, navSectionIds());
  const header = document.querySelector(".site-header .glass-pill");
  if (header) setupHeaderScrolled(header, behavior.headerScrolledPx);
  setupIdlePause();
  setupTouchReveal();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

export {};
