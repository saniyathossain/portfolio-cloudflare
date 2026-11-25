/**
 * Real rendered heights of the content-visibility sections (collapsed state) — the numbers for contain-intrinsic-size.
 *   BASE=http://127.0.0.1:8803/ node scripts/section-heights.ts
 */
import { launchBrowser, requireEnv, sleep } from "./lib/browser.ts";

const BASE = requireEnv("BASE");
const WIDTHS = [1440, 1100, 800, 641, 390];
const VIEWPORT_HEIGHT_PX = 900;
const AFTER_LOAD_MS = 2500;
const WIDTH_COLUMN = 5;
const SECTION_IDS = ["about", "services", "experience", "education"];
const STATS_SELECTOR = "section[aria-label='Statistics']";
const FORCE_VISIBLE_CSS = ".sec { content-visibility: visible !important; }";

const browser = await launchBrowser();
for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: VIEWPORT_HEIGHT_PX });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.addStyleTag({ content: FORCE_VISIBLE_CSS });
  await sleep(AFTER_LOAD_MS);
  const heights = await page.evaluate(
    (ids, statsSelector) => {
      const heightOf = (element: Element | null): number => (element as HTMLElement).offsetHeight;
      const entries: [string, number][] = ids.map((id) => [id, heightOf(document.getElementById(id))]);
      entries.push(["stats", heightOf(document.querySelector(statsSelector))]);
      return Object.fromEntries(entries);
    },
    SECTION_IDS,
    STATS_SELECTOR,
  );
  console.log(String(width).padStart(WIDTH_COLUMN), JSON.stringify(heights));
  await page.close();
}
await browser.close();
