/**
 * Vertical whitespace between the content of adjacent sections, at several widths (px).
 *   BASE=http://127.0.0.1:8803/ [WIDTHS=360,768,1024,1440,1920] node scripts/measure-gaps.ts
 */
import { FORCE_VISIBLE_CSS, launchBrowser, READY_SELECTOR, READY_TIMEOUT_MS, requireEnv, sleep } from "./lib/browser.ts";

const BASE = requireEnv("BASE");
const WIDTHS = (process.env["WIDTHS"] ?? "360,768,1024,1440,1920").split(",").map(Number);
const VIEWPORT_HEIGHT_PX = 900;
const AFTER_READY_MS = 2500;
const WIDTH_COLUMN = 5;
// Off-screen sections use their placeholder size under content-visibility:auto; render them all for true layout numbers.

const browser = await launchBrowser();
for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: VIEWPORT_HEIGHT_PX });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.addStyleTag({ content: FORCE_VISIBLE_CSS });
  await page.waitForSelector(READY_SELECTOR, { timeout: READY_TIMEOUT_MS }).catch(() => undefined);
  await sleep(AFTER_READY_MS);
  const gaps = await page.evaluate(() => {
    // Layout-based (offsetTop chain), so scroll-reveal / parallax transforms cannot distort the numbers.
    const documentTop = (element: HTMLElement): number => {
      let top = 0;
      for (let node: Element | null = element; node instanceof HTMLElement; node = node.offsetParent) top += node.offsetTop;
      return top;
    };
    const blocks = [...document.querySelectorAll<HTMLElement>("main > section, .site-footer")].map((section) => {
      const shell = section.id === "home" ? section : (section.querySelector<HTMLElement>(".shell") ?? section);
      // The hero's background fills its whole box, so its box edge is its visible edge.
      const children = shell === section ? [section] : [...shell.children].filter((child) => (child as HTMLElement).offsetHeight > 0);
      const tops = children.map((child) => documentTop(child as HTMLElement));
      const bottoms = children.map((child) => documentTop(child as HTMLElement) + (child as HTMLElement).offsetHeight);
      return {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- an empty id must fall through
        name: section.id || section.getAttribute("aria-label") || section.className.split(" ")[0],
        top: Math.min(...tops),
        bottom: Math.max(...bottoms),
      };
    });
    return blocks.slice(1).map((block, index) => `${blocks[index]?.name}→${block.name}: ${Math.round(block.top - (blocks[index]?.bottom ?? 0))}`);
  });
  console.log(String(width).padStart(WIDTH_COLUMN), gaps.join(" | "));
  await page.close();
}
await browser.close();
