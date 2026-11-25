/**
 * Behaviour smoke test: drives the page like a visitor and prints a JSON report.
 * Run it against the legacy build and the new build and diff the two reports.
 *   BASE=http://127.0.0.1:8802/ WIDTH=1440 node scripts/behavior-check.ts
 */
import type { Page } from "puppeteer-core";
import { centerAndClickHandle, launchBrowser, READY_SELECTOR, READY_TIMEOUT_MS, requireEnv, sleep } from "./lib/browser.ts";

const BASE = requireEnv("BASE");
const WIDTH = Number(process.env["WIDTH"] ?? 1440);
const MOBILE_BREAKPOINT_PX = 600;
const MOBILE_HEIGHT_PX = 800;
const DESKTOP_HEIGHT_PX = 900;
const AFTER_LOAD_MS = 2500;
const CLICK_SETTLE_MS = 1200;
const SHORT_WAIT_MS = 500;
const MEDIUM_WAIT_MS = 600;
const BACK_TO_TOP_SCROLL_Y = 1500;
const BACK_TO_TOP_HOME_THRESHOLD_PX = 30;
const NAV_ITEM_INDEX = 4;
const MENU_NAV_SETTLE_MS = 1500;
const SCROLLED_AWAY_PX = 100;
const OUTSIDE_CLICK_POINT = { left: 5, top: 400 } as const;
const SEARCH_TERM = "laravel";
const STATS_SETTLE_MS = 2500;
const CLOCK_PROPERTIES = ["--clock-h", "--clock-m", "--clock-s", "--clock-s-delay"];

const browser = await launchBrowser();
const page: Page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: WIDTH < MOBILE_BREAKPOINT_PX ? MOBILE_HEIGHT_PX : DESKTOP_HEIGHT_PX });
const problems: string[] = [];
page.on("console", (message) => {
  if (message.type() === "error") problems.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => problems.push(`pageerror: ${String(error)}`));
page.on("requestfailed", (request) => problems.push(`requestfailed: ${request.url()}`));

await page.goto(BASE, { waitUntil: "networkidle0" });
await page.waitForSelector(READY_SELECTOR, { timeout: READY_TIMEOUT_MS }).catch(() => problems.push("html.is-ready never set"));
await sleep(AFTER_LOAD_MS);

const count = (selector: string): Promise<number> => page.$$eval(selector, (elements) => elements.length);
const text = (selector: string): Promise<string | null | undefined> =>
  page.$eval(selector, (element) => element.textContent.replace(/\s+/g, " ").trim()).catch(() => null);
const trimmedTexts = (selector: string, limit?: number): Promise<(string | undefined)[]> =>
  page.$$eval(selector, (elements, max) => elements.slice(0, max).map((element) => element.textContent.trim()), limit ?? Number.MAX_SAFE_INTEGER);
const visibleCount = (selector: string): Promise<number> =>
  page.$$eval(selector, (elements) => elements.filter((element) => getComputedStyle(element).display !== "none").length);
const scrollToY = (scrollY: number): Promise<void> =>
  page.evaluate((target) => {
    window.scrollTo(0, target);
  }, scrollY);
const centerAndClick = async (selector: string, index = 0): Promise<boolean> => {
  const handle = (await page.$$(selector))[index];
  if (!handle) return false;
  await centerAndClickHandle(handle, CLICK_SETTLE_MS);
  return true;
};

const report: Record<string, Record<string, unknown>> = {};

report["structure"] = {
  sections: await count("main section"),
  expGroups: await count(".exp-group"),
  expRows: await count(".exp-row"),
  skillPills: await count(".skills-flat__pill, .skills-panel__head ~ .pill-row .brand-pill"),
  eduRows: await count(".edu-row"),
  statTiles: await count(".stats-panel li"),
  serviceRows: await count(".service-row"),
  partnerOrbs: await count(".partner-orb"),
  footerLinks: await count(".site-footer__links li"),
  navDesktopButtons: await count(".nav-desktop button"),
  monogramPills: await count(".brand-pill__mono"),
};

report["livedates"] = {
  footerCopyright: await text(".site-footer__meta"),
  presentTenure: await trimmedTexts(".exp-row__period + .popover__panel .popover__label, .popover__panel .popover__label", 3),
  companyTenure: await trimmedTexts(".exp-group__tenure-badge span:last-child"),
};

// header clock: format, live hand angles and the zoom-on-click effect from motion.js
const clockFace = await page.$(".clock-face");
const clock: Record<string, unknown> = {
  timePattern: /^\d{1,2}:\d{2}(am|pm)$/.test((await text(".clock-time")) ?? ""),
  datePattern: /^\d{1,2} [A-Za-z]+, \d{4}$/.test((await text(".clock-date")) ?? ""),
  hasAngles: await page.$eval(
    ".clock-face",
    (element, names) => names.every((name) => (element as HTMLElement).style.getPropertyValue(name) !== ""),
    CLOCK_PROPERTIES,
  ),
};
report["clock"] = clock;
if (clockFace) {
  await clockFace.click();
  await sleep(SHORT_WAIT_MS);
  clock["zoomedAfterClick"] = await page.$eval(".site-header", (element) => element.classList.contains("clock-zoomed"));
  await page.mouse.click(OUTSIDE_CLICK_POINT.left, OUTSIDE_CLICK_POINT.top);
  await sleep(SHORT_WAIT_MS);
  clock["zoomClearedAfterOutsideClick"] = await page.$eval(".site-header", (element) => !element.classList.contains("clock-zoomed"));
}

// back-to-top: hidden at the top, appears past the threshold, scrolls home on click
await scrollToY(0);
await sleep(MEDIUM_WAIT_MS);
const backToTop: Record<string, unknown> = {
  hiddenAtTop: await page.$eval(".back-to-top", (element) => !element.classList.contains("is-visible") && (element as HTMLElement).tabIndex === -1),
};
report["backToTop"] = backToTop;
await scrollToY(BACK_TO_TOP_SCROLL_Y);
await sleep(900);
backToTop["visibleAfterScroll"] = await page.$eval(
  ".back-to-top",
  (element) => element.classList.contains("is-visible") && (element as HTMLElement).tabIndex === 0,
);
await page.click(".back-to-top");
await sleep(1800);
backToTop["scrolledHome"] = (await page.evaluate(() => window.scrollY)) < BACK_TO_TOP_HOME_THRESHOLD_PX;
backToTop["hashCleared"] = (await page.evaluate(() => location.hash)) === "";

// menu → navigate → overlay closes
await centerAndClick(".menu-btn");
const menu: Record<string, unknown> = { opened: await count(".nav-overlay.is-open"), items: await count(".nav-overlay__item") };
report["menu"] = menu;
await centerAndClick(".nav-overlay__item", NAV_ITEM_INDEX);
await sleep(MENU_NAV_SETTLE_MS);
menu["afterNavScrollY"] = await page.evaluate((threshold) => window.scrollY > threshold, SCROLLED_AWAY_PX);
menu["closed"] = (await count(".nav-overlay.is-open")) === 0;

// contact modal
await scrollToY(0);
await sleep(SHORT_WAIT_MS);
await centerAndClick(".hero .pill-btn-dark");
const modal: Record<string, unknown> = {
  opened: await count(".modal-backdrop.is-open"),
  hasForm: (await count(".modal-form, .uc-panel")) > 0,
};
report["modal"] = modal;
await page.keyboard.press("Escape");
await sleep(800);
modal["closedAfterEscape"] = (await count(".modal-backdrop.is-open")) === 0;

// hero card carousel
await scrollToY(0);
await sleep(SHORT_WAIT_MS);
const captionBefore = await text(".hero-card__caption");
await centerAndClick(".hero-card__arrow", 1);
await sleep(MEDIUM_WAIT_MS);
report["heroCard"] = { captionBefore, captionAfter: await text(".hero-card__caption"), dots: await count(".hero-card__dot") };

// accordion
await centerAndClick(".exp-row");
const accordion: Record<string, unknown> = {
  expanded: await page.$eval(".exp-row", (element) => element.getAttribute("aria-expanded")),
  openPanels: await count(".exp-details.is-open"),
  detailItems: await count(".exp-details.is-open .exp-details__list li"),
  pills: await count(".exp-details.is-open .brand-pill"),
};
report["accordion"] = accordion;
await centerAndClick(".exp-row");
await sleep(MEDIUM_WAIT_MS);
accordion["closedAgain"] = (await count(".exp-details.is-open")) === 0;

// editorial tab + search
const editorial: Record<string, unknown> = { rowsBefore: await count(".editorial-row") };
report["editorial"] = editorial;
if ((await count(".editorial-tabs__btn")) > 1) {
  await centerAndClick(".editorial-tabs__btn", 1);
  editorial["rowsAfterTab"] = await count(".editorial-row");
}
await centerAndClick(".editorial-search__orb--search");
await page.keyboard.type(SEARCH_TERM);
await sleep(1000);
editorial["rowsAfterSearch"] = await count(".editorial-row");

// skills (mobile "view more")
const toggleVisible = await page.$eval(".skills-flat__toggle", (element) => getComputedStyle(element).display !== "none").catch(() => false);
const skills: Record<string, unknown> = { toggleVisible, visiblePillsBefore: await visibleCount(".skills-flat__pill") };
report["skills"] = skills;
if (toggleVisible) {
  await centerAndClick(".skills-flat__toggle");
  await sleep(800);
  skills["visiblePillsAfterToggle"] = await visibleCount(".skills-flat__pill");
}

// stats counters finished
await centerAndClick(".stats-panel__value");
await sleep(STATS_SETTLE_MS);
const statsValues = await trimmedTexts(".stats-panel__value");

console.log(JSON.stringify({ ...report, stats: statsValues, problems: [...new Set(problems)] }, null, 2));
await browser.close();
