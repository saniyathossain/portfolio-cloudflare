/** Vertical whitespace between the content of adjacent sections, at several widths (px). */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE;
const WIDTHS = (process.env.WIDTHS ?? "360,768,1024,1440,1920").split(",").map(Number);
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE, { waitUntil: "networkidle0" });
  // Off-screen sections use their placeholder size under content-visibility:auto; render them all for true layout numbers.
  await page.addStyleTag({ content: ".sec { content-visibility: visible !important; }" });
  await page.waitForSelector("html.is-ready", { timeout: 15000 }).catch(() => undefined);
  await sleep(2500);
  const gaps = await page.evaluate(() => {
    // Layout-based (offsetTop chain), so scroll-reveal / parallax transforms cannot distort the numbers.
    const documentTop = (element) => {
      let top = 0;
      for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
      return top;
    };
    const blocks = [...document.querySelectorAll("main > section, .site-footer")].map((section) => {
      const shell = section.id === "home" ? section : (section.querySelector(".shell") ?? section);
      // The hero's background fills its whole box, so its box edge is its visible edge.
      const children = shell === section ? [section] : [...shell.children].filter((child) => child.offsetHeight > 0);
      const tops = children.map((child) => documentTop(child));
      const bottoms = children.map((child) => documentTop(child) + child.offsetHeight);
      return { name: section.id || section.getAttribute("aria-label") || section.className.split(" ")[0], top: Math.min(...tops), bottom: Math.max(...bottoms) };
    });
    return blocks.slice(1).map((block, index) => `${blocks[index].name}→${block.name}: ${Math.round(block.top - blocks[index].bottom)}`);
  });
  console.log(String(width).padStart(5), gaps.join(" | "));
  await page.close();
}
await browser.close();
