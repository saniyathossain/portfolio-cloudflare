/** Whitespace inside each section's heading block: title → subtitle and subtitle → first content block (px). */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE;
const WIDTHS = (process.env.WIDTHS ?? "360,768,1440").split(",").map(Number);
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const rows = await page.evaluate(() =>
    ["services", "experience", "skills", "editorial", "education"].map((id) => {
      const section = document.getElementById(id);
      const heading = section?.querySelector("h2");
      const subtitle = section?.querySelector(".sec-sub");
      const paintedSelector = { services: ".services-list", experience: ".exp-list", skills: ".skills-flat__row .brand-pill", editorial: ".editorial-tabs", education: ".edu-grid" }[id];
      const next = section?.querySelector(paintedSelector);
      const rect = (element) => element?.getBoundingClientRect();
      const style = (element) => (element ? getComputedStyle(element) : null);
      return {
        id,
        titleToSub: Math.round(rect(subtitle).top - rect(heading).bottom),
        subToContent: Math.round(rect(next).top - rect(subtitle).bottom),
        subMarginBottom: style(subtitle).marginBottom,
        nextMarginTop: style(next).marginTop,
        nextClass: String(next.className).slice(0, 28),
      };
    }),
  );
  console.log(`--- ${width}px`);
  for (const row of rows) console.log(JSON.stringify(row));
  await page.close();
}
await browser.close();
