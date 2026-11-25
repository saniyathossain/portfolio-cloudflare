/**
 * First-visit flash guard check. The full stylesheet is held back (like a cold, slow first load) and the page is
 * inspected in that window:
 *   1. html.css-pending is set;
 *   2. every server-rendered block that is not covered by the inline critical CSS is hidden;
 *   3. no icon is oversized (an unsized inline SVG renders ~300 px wide);
 * then, once the stylesheet applies, the guard must lift and everything must be visible again.
 *   BASE=http://127.0.0.1:8803/ DELAY_MS=3000 node scripts/fouc-check.ts   (exit 1 on any failure)
 */
import { launchBrowser, requireEnv, sleep } from "./lib/browser.ts";

const BASE = requireEnv("BASE");
const DELAY_MS = Number(process.env["DELAY_MS"] ?? 3000);
const STYLESHEET_URL_FRAGMENT = "/assets/css/styles.min.css";
const GUARDED = [".nav-desktop button", ".hero-partners", "main > section:not(#home)", ".site-footer"];
const MAX_PLAUSIBLE_ICON_PX = 80; // the largest intentional icon (hero card badge) is ~60 px
const DOM_SETTLE_MS = 400;
const SETTLE_AFTER_CSS_MS = 1500;
const VIEWPORTS = [
  { label: "mobile", width: 412, height: 823 },
  { label: "desktop", width: 1440, height: 900 },
] as const;
const MAX_REPORTED_ICONS = 4;

const failures: string[] = [];
const browser = await launchBrowser();
for (const { label, width, height } of VIEWPORTS) {
  // A fresh browser context per viewport: no HTTP cache and no service worker left over from the previous run,
  // either of which would serve the stylesheet instantly and hide the window under test.
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width, height });
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    void (async () => {
      if (request.url().includes(STYLESHEET_URL_FRAGMENT)) await sleep(DELAY_MS);
      await request.continue();
    })();
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await sleep(DOM_SETTLE_MS);

  const pending = await page.evaluate(
    (guarded, maxIconPx) => ({
      isGuardOn: document.documentElement.classList.contains("css-pending"),
      visibleGuarded: guarded.flatMap((selector) =>
        [...document.querySelectorAll(selector)]
          .filter((element) => getComputedStyle(element).visibility !== "hidden")
          .map(() => selector),
      ),
      oversizedIcons: [...document.querySelectorAll("svg.ui-icon")]
        .filter((svg) => getComputedStyle(svg).visibility !== "hidden" && svg.getBoundingClientRect().width > maxIconPx)
        .map((svg) => `${Math.round(svg.getBoundingClientRect().width)}px in ${svg.parentElement?.className ?? "?"}`),
    }),
    GUARDED,
    MAX_PLAUSIBLE_ICON_PX,
  );
  if (!pending.isGuardOn) failures.push(`${label}: html.css-pending missing while the stylesheet is pending`);
  if (pending.visibleGuarded.length) failures.push(`${label}: visible before CSS: ${[...new Set(pending.visibleGuarded)].join(", ")}`);
  if (pending.oversizedIcons.length) {
    failures.push(`${label}: oversized icons before CSS: ${pending.oversizedIcons.slice(0, MAX_REPORTED_ICONS).join("; ")}`);
  }

  await sleep(DELAY_MS + SETTLE_AFTER_CSS_MS);
  const settled = await page.evaluate(
    (guarded) => ({
      isGuardOn: document.documentElement.classList.contains("css-pending"),
      stillHidden: guarded.filter((selector) =>
        [...document.querySelectorAll(selector)].some((element) => getComputedStyle(element).visibility === "hidden"),
      ),
    }),
    GUARDED,
  );
  if (settled.isGuardOn) failures.push(`${label}: css-pending never cleared after the stylesheet loaded`);
  if (settled.stillHidden.length) failures.push(`${label}: still hidden after CSS: ${settled.stillHidden.join(", ")}`);
  console.log(label, "checked");
  await context.close();
}
await browser.close();

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("first-visit flash guard: OK");
