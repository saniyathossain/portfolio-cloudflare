/** Screenshot of the whitespace around a section boundary, e.g. skills → editorial, at a given width (retina). */
import puppeteer from "puppeteer-core";

const { BASE, OUT, WIDTH = "1000", SELECTOR = "#editorial" } = process.env;
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: Number(WIDTH), height: 700, deviceScaleFactor: 2 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(BASE, { waitUntil: "networkidle0" });
// EXTRA_CSS lets a caller inject a control, e.g. the old zero-padding sections that clipped the card shadows.
if (process.env.EXTRA_CSS) await page.addStyleTag({ content: process.env.EXTRA_CSS });
await new Promise((resolve) => setTimeout(resolve, 3000));
await page.evaluate((selector, offset) => {
  const element = document.querySelector(selector);
  window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - offset, behavior: "instant" });
}, SELECTOR, Number(process.env.OFFSET ?? 560));
await new Promise((resolve) => setTimeout(resolve, 1200));
await page.screenshot({ path: OUT });
await browser.close();
