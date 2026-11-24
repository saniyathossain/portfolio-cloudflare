/**
 * Behaviour smoke test: drives the page like a visitor and prints a JSON report.
 * Run it against the legacy build and the new build and diff the two reports.
 *   BASE=http://127.0.0.1:8802/ WIDTH=1440 node scripts/behavior-check.mjs
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE;
const WIDTH = Number(process.env.WIDTH ?? 1440);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: WIDTH < 600 ? 800 : 900 });
const problems = [];
page.on("console", (message) => message.type() === "error" && problems.push(`console: ${message.text()}`));
page.on("pageerror", (error) => problems.push(`pageerror: ${String(error)}`));
page.on("requestfailed", (request) => problems.push(`requestfailed: ${request.url()}`));

await page.goto(BASE, { waitUntil: "networkidle0" });
await page.waitForSelector("html.is-ready", { timeout: 15000 }).catch(() => problems.push("html.is-ready never set"));
await sleep(2500);

const report = {};
const count = (selector) => page.$$eval(selector, (elements) => elements.length);
const text = (selector) => page.$eval(selector, (element) => element.textContent?.replace(/\s+/g, " ").trim()).catch(() => null);
const centerAndClick = async (selector, index = 0) => {
  const handles = await page.$$(selector);
  const handle = handles[index];
  if (!handle) return false;
  await handle.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await sleep(500);
  await handle.click();
  await sleep(1200);
  return true;
};

report.structure = {
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

report.livedates = {
  footerCopyright: await text(".site-footer__meta"),
  presentTenure: await page.$$eval(".exp-row__period + .popover__panel .popover__label, .popover__panel .popover__label", (elements) =>
    elements.slice(0, 3).map((element) => element.textContent?.trim())),
  companyTenure: await page.$$eval(".exp-group__tenure-badge span:last-child", (elements) => elements.map((element) => element.textContent?.trim())),
};

// menu → navigate → overlay closes
await centerAndClick(".menu-btn");
report.menu = { opened: await count(".nav-overlay.is-open"), items: await count(".nav-overlay__item") };
await centerAndClick(".nav-overlay__item", 4);
await sleep(1500);
report.menu.afterNavScrollY = await page.evaluate(() => window.scrollY > 100);
report.menu.closed = (await count(".nav-overlay.is-open")) === 0;

// contact modal
await page.evaluate(() => window.scrollTo(0, 0));
await sleep(500);
await centerAndClick(".hero .pill-btn-dark");
report.modal = { opened: await count(".modal-backdrop.is-open"), hasForm: await count(".modal-form, .uc-panel") > 0 };
await page.keyboard.press("Escape");
await sleep(800);
report.modal.closedAfterEscape = (await count(".modal-backdrop.is-open")) === 0;

// hero card carousel
await page.evaluate(() => window.scrollTo(0, 0));
await sleep(500);
const captionBefore = await text(".hero-card__caption");
await centerAndClick(".hero-card__arrow", 1);
await sleep(600);
report.heroCard = { captionBefore, captionAfter: await text(".hero-card__caption"), dots: await count(".hero-card__dot") };

// accordion
await centerAndClick(".exp-row");
report.accordion = {
  expanded: await page.$eval(".exp-row", (element) => element.getAttribute("aria-expanded")),
  openPanels: await count(".exp-details.is-open"),
  detailItems: await count(".exp-details.is-open .exp-details__list li"),
  pills: await count(".exp-details.is-open .brand-pill"),
};
await centerAndClick(".exp-row");
await sleep(600);
report.accordion.closedAgain = (await count(".exp-details.is-open")) === 0;

// editorial tab + search
report.editorial = { rowsBefore: await count(".editorial-row") };
const tabCount = await count(".editorial-tabs__btn");
if (tabCount > 1) {
  await centerAndClick(".editorial-tabs__btn", 1);
  report.editorial.rowsAfterTab = await count(".editorial-row");
}
await centerAndClick(".editorial-search__orb--search");
await page.keyboard.type("laravel");
await sleep(1000);
report.editorial.rowsAfterSearch = await count(".editorial-row");

// skills (mobile "view more")
const toggleVisible = await page.$eval(".skills-flat__toggle", (element) => getComputedStyle(element).display !== "none").catch(() => false);
report.skills = { toggleVisible, visiblePillsBefore: await page.$$eval(".skills-flat__pill", (elements) => elements.filter((element) => getComputedStyle(element).display !== "none").length) };
if (toggleVisible) {
  await centerAndClick(".skills-flat__toggle");
  await sleep(800);
  report.skills.visiblePillsAfterToggle = await page.$$eval(".skills-flat__pill", (elements) => elements.filter((element) => getComputedStyle(element).display !== "none").length);
}

// stats counters finished
await centerAndClick(".stats-panel__value");
await sleep(2500);
report.stats = await page.$$eval(".stats-panel__value", (elements) => elements.map((element) => element.textContent?.trim()));

report.problems = [...new Set(problems)];
console.log(JSON.stringify(report, null, 2));
await browser.close();
