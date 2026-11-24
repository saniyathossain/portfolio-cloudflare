/**
 * Drives the Experience accordion like a visitor and prints the state after each step.
 *   BASE=http://127.0.0.1:8814/ WIDTH=1440 [REDUCED=1] node scripts/experience-accordion-check.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE;
const WIDTH = Number(process.env.WIDTH ?? 1440);
const REDUCED = process.env.REDUCED === "1";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: 900 });
if (REDUCED) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
const problems = [];
page.on("console", (message) => message.type() === "error" && problems.push(`console: ${message.text()}`));
page.on("pageerror", (error) => problems.push(`pageerror: ${String(error)}`));
await page.goto(BASE, { waitUntil: "networkidle0", timeout: 60000 });
await sleep(3000);

const snap = () =>
  page.evaluate(() =>
    [...document.querySelectorAll(".exp-item")].slice(0, 4).map((item) => {
      const panel = item.querySelector(".exp-details");
      return {
        expanded: item.querySelector(".exp-row").getAttribute("aria-expanded"),
        open: panel.classList.contains("is-open"),
        inert: panel.hasAttribute("inert"),
        height: panel.style.height,
        overflow: panel.style.overflow,
        items: panel.querySelectorAll(".exp-details__list li").length,
        pills: panel.querySelectorAll(".brand-pill").length,
        renderedHeight: Math.round(panel.getBoundingClientRect().height),
        chevron: item.querySelector(".exp-row__chev").getAttribute("class"),
      };
    }),
  );
const click = async (index) => {
  const rows = await page.$$(".exp-row");
  await rows[index].evaluate((element) => element.scrollIntoView({ block: "center" }));
  await sleep(600);
  await rows[index].click();
};
const log = async (label, only) => {
  const state = await snap();
  console.log(label, JSON.stringify(only === undefined ? state : state[only]));
};

await log("initial", 0);
await click(0);
await sleep(150);
await log("mid-open", 0);
await sleep(1500);
await log("open0", 0);
await click(1);
await sleep(1800);
console.log("open0+1", JSON.stringify((await snap()).slice(0, 2)));
await click(0);
await sleep(150);
await log("mid-close", 0);
await sleep(1500);
await log("closed0", 0);
await click(0);
await sleep(1800);
await log("reopen0", 0);
await page.evaluate(() => document.querySelector(".exp-row__period").click());
await sleep(500);
console.log("after period click, still open:", (await snap())[0].open);
console.log("problems", JSON.stringify(problems));
await browser.close();
