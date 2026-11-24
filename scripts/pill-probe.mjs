/**
 * Frame-by-frame trace of the icon→label hover reveal on a skills pill: pill width, label opacity and whether the
 * shell is clipped, sampled every animation frame after the pointer enters it. Shows whether the shell grows
 * smoothly or snaps, and how the neighbouring pills move.
 *   BASE=http://127.0.0.1:8803/ node scripts/pill-probe.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE;
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(3000);

const pills = await page.$$(".skills-flat__pill");
const target = pills[2];
await target.evaluate((element) => element.scrollIntoView({ block: "center" }));
await sleep(1800);

const box = await target.boundingBox();
const centerX = box.x + box.width / 2;
const centerY = box.y + box.height / 2;
// Start well clear of the row, so no pill is open (an open neighbour would shift the one we want to watch).
await page.mouse.move(centerX, centerY - 220);
await sleep(250);

// Mark the pill that is actually under the pointer's final position, and its right-hand neighbour.
await page.evaluate(
  ([x, y]) => {
    const pill = document.elementFromPoint(x, y)?.closest(".brand-pill");
    pill?.setAttribute("data-probe", "target");
    pill?.nextElementSibling?.setAttribute("data-probe", "neighbour");
    window.__trace = [];
    window.__start = () => {
      const startedAt = performance.now();
      const watched = ["target", "neighbour"].map((name) => document.querySelector(`[data-probe="${name}"]`));
      const tick = () => {
        const now = Math.round(performance.now() - startedAt);
        const [shell, next] = watched;
        const label = shell?.querySelector(".brand-pill__label-in");
        window.__trace.push([
          now,
          Math.round(shell?.getBoundingClientRect().width ?? -1),
          Number(label ? getComputedStyle(label).opacity : 0).toFixed(2),
          shell?.classList.contains("is-open") ? "open" : "-",
          label ? getComputedStyle(label).clipPath.replace("inset", "").replace(/ /g, "") : "-",
          getComputedStyle(shell).scale,
          Math.round(next?.getBoundingClientRect().left ?? -1),
        ]);
        if (now < 900) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
  },
  [centerX, centerY],
);
await page.evaluate(() => window.__start());
await page.mouse.move(centerX, centerY, { steps: 12 });
await sleep(1100);

const trace = await page.evaluate(() => window.__trace);
console.log("t(ms) shellWidth labelOpacity state labelClip shellScale neighbourLeft");
console.log(trace.filter((_, index) => index % 3 === 0).slice(0, 15).map((row) => row.join("  ")).join("\n"));
await browser.close();
