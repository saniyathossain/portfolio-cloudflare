/** Responsive sanity sweep: horizontal overflow, header overlap and the exact experience → skills gap at many widths. */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE;
const WIDTHS = (process.env.WIDTHS ?? "320,360,390,430,600,768,900,1024,1280,1440,1920,2560").split(",").map(Number);
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
let failed = false;
for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await new Promise((resolve) => setTimeout(resolve, 2200));
  const result = await page.evaluate(() => {
    const top = (element) => {
      let sum = 0;
      for (let node = element; node; node = node.offsetParent) sum += node.offsetTop;
      return sum;
    };
    const list = document.querySelector("#experience .exp-list");
    const skillsHeading = document.querySelector("#skills h2");
    const gapAfterExperience = top(skillsHeading) - (top(list) + list.offsetHeight);
    const overflowing = [...document.querySelectorAll("main *, header *, footer *")]
      .filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && getComputedStyle(element).position !== "fixed" && !element.closest(".hero__backdrop, [data-parallax], .aurora, .nav-overlay, .modal-backdrop, .skills-flat__panel, [aria-hidden='true']"))
      .slice(0, 3)
      .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 24)}`);
    return {
      horizontalScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      gapAfterExperience: Math.round(gapAfterExperience),
      overflowing,
    };
  });
  const bad = result.horizontalScroll > 1 || result.overflowing.length > 0;
  if (bad) failed = true;
  console.log(String(width).padStart(5), `hscroll=${result.horizontalScroll}`.padEnd(11), `exp→skills=${result.gapAfterExperience}`.padEnd(16), result.overflowing.length ? `OVERFLOW ${result.overflowing.join(", ")}` : "ok");
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
