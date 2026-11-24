/** Real rendered heights of the content-visibility sections (collapsed state) — the numbers for contain-intrinsic-size. */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE;
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
for (const width of [1440, 1100, 800, 641, 390]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.addStyleTag({ content: ".sec { content-visibility: visible !important; }" });
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const heights = await page.evaluate(() => Object.fromEntries(["about", "services", "experience", "education"].map((id) => [id, document.getElementById(id).offsetHeight]).concat([["stats", document.querySelector("section[aria-label='Statistics']").offsetHeight]])));
  console.log(String(width).padStart(5), JSON.stringify(heights));
  await page.close();
}
await browser.close();
