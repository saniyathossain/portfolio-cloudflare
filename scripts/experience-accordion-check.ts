/**
 * Drives the Experience accordion like a visitor and prints the state after each step.
 *   BASE=http://127.0.0.1:8814/ WIDTH=1440 [REDUCED=1] node scripts/experience-accordion-check.ts
 */
import { centerAndClickHandle, launchBrowser, requireEnv, sleep } from "./lib/browser.ts";

const BASE = requireEnv("BASE");
const WIDTH = Number(process.env["WIDTH"] ?? 1440);
const REDUCED = process.env["REDUCED"] === "1";
const VIEWPORT_HEIGHT_PX = 900;
const NAVIGATION_TIMEOUT_MS = 60_000;
const AFTER_LOAD_MS = 3000;
const SNAPSHOT_ITEM_LIMIT = 4;
const MID_ANIMATION_MS = 150;
const ANIMATION_DONE_MS = 1500;
const CLICK_SETTLE_MS = 1800;
const SCROLL_SETTLE_MS = 600;

interface ItemSnapshot {
  expanded: string | null;
  open: boolean;
  inert: boolean;
  height: string;
  overflow: string;
  items: number;
  pills: number;
  renderedHeight: number;
  chevron: string | null;
}

const browser = await launchBrowser();
const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: VIEWPORT_HEIGHT_PX });
if (REDUCED) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
const problems: string[] = [];
page.on("console", (message) => {
  if (message.type() === "error") problems.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => problems.push(`pageerror: ${String(error)}`));
await page.goto(BASE, { waitUntil: "networkidle0", timeout: NAVIGATION_TIMEOUT_MS });
await sleep(AFTER_LOAD_MS);

const snapshot = (): Promise<ItemSnapshot[]> =>
  page.evaluate(
    (limit) => {
      const requireIn = (root: ParentNode, selector: string): HTMLElement => {
        const found = root.querySelector<HTMLElement>(selector);
        if (!found) throw new Error(`Missing ${selector}`);
        return found;
      };
      return [...document.querySelectorAll(".exp-item")].slice(0, limit).map((item) => {
        const panel = requireIn(item, ".exp-details");
        return {
          expanded: requireIn(item, ".exp-row").getAttribute("aria-expanded"),
          open: panel.classList.contains("is-open"),
          inert: panel.hasAttribute("inert"),
          height: panel.style.height,
          overflow: panel.style.overflow,
          items: panel.querySelectorAll(".exp-details__list li").length,
          pills: panel.querySelectorAll(".brand-pill").length,
          renderedHeight: Math.round(panel.getBoundingClientRect().height),
          chevron: requireIn(item, ".exp-row__chev").getAttribute("class"),
        };
      });
    },
    SNAPSHOT_ITEM_LIMIT,
  );
const clickRow = async (index: number): Promise<void> => {
  const row = (await page.$$(".exp-row"))[index];
  if (!row) throw new Error(`Experience row ${index} not found`);
  await centerAndClickHandle(row, 0, SCROLL_SETTLE_MS);
};
const log = async (label: string, only?: number): Promise<void> => {
  const state = await snapshot();
  console.log(label, JSON.stringify(only === undefined ? state : state[only]));
};

await log("initial", 0);
await clickRow(0);
await sleep(MID_ANIMATION_MS);
await log("mid-open", 0);
await sleep(ANIMATION_DONE_MS);
await log("open0", 0);
await clickRow(1);
await sleep(CLICK_SETTLE_MS);
console.log("open0+1", JSON.stringify((await snapshot()).slice(0, 2)));
await clickRow(0);
await sleep(MID_ANIMATION_MS);
await log("mid-close", 0);
await sleep(ANIMATION_DONE_MS);
await log("closed0", 0);
await clickRow(0);
await sleep(CLICK_SETTLE_MS);
await log("reopen0", 0);
await page.evaluate(() => {
  document.querySelector<HTMLElement>(".exp-row__period")?.click();
});
await sleep(500);
console.log("after period click, still open:", (await snapshot())[0]?.open);
console.log("problems", JSON.stringify(problems));
await browser.close();
