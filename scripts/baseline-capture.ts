/**
 * Captures full-page, per-section and interaction-state screenshots at four widths.
 *   BASE=http://127.0.0.1:8802/ OUT=/tmp/shots node scripts/baseline-capture.ts
 */
import type { ElementHandle, Page } from "puppeteer-core";
import { centerAndClickHandle, launchBrowser, READY_SELECTOR, requireEnv, sleep } from "./lib/browser.ts";

const BASE = requireEnv("BASE");
const OUT = requireEnv("OUT");
const WIDTHS = [360, 768, 1024, 1440];
const MOBILE_BREAKPOINT_PX = 600;
const MOBILE_HEIGHT_PX = 800;
const DESKTOP_HEIGHT_PX = 900;
const READY_TIMEOUT_MS = 10_000;
const AFTER_LOAD_MS = 1500;
const SCROLL_STEP_PX = 500;
const SCROLL_STEP_WAIT_MS = 120;
const SEARCH_TERM = "laravel";
const SECTION_SELECTOR = "main section, footer";

interface FreshPage {
  page: Page;
  errors: string[];
}
interface SectionInfo {
  index: number;
  id: string;
}

const browser = await launchBrowser();
const log: string[] = [];

async function freshPage(width: number): Promise<FreshPage> {
  const page = await browser.newPage();
  await page.setViewport({ width, height: width < MOBILE_BREAKPOINT_PX ? MOBILE_HEIGHT_PX : DESKTOP_HEIGHT_PX, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.waitForSelector(READY_SELECTOR, { timeout: READY_TIMEOUT_MS }).catch(() => undefined);
  await sleep(AFTER_LOAD_MS);
  return { page, errors };
}

async function screenshot(page: Page, name: string, fullPage = false): Promise<void> {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
}

async function tryStep(name: string, step: () => Promise<void>): Promise<void> {
  try {
    await step();
  } catch (error) {
    log.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const slug = (value: string): string => value.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

async function requireHandle(page: Page, selector: string): Promise<ElementHandle> {
  const handle = await page.$(selector);
  if (!handle) throw new Error(`Cannot read properties of null: ${selector} not found`);
  return handle;
}

async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
}

async function scrollThroughPage(page: Page): Promise<void> {
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let offset = 0; offset < pageHeight; offset += SCROLL_STEP_PX) {
    await page.evaluate((target) => {
      window.scrollTo(0, target);
    }, offset);
    await sleep(SCROLL_STEP_WAIT_MS);
  }
  await sleep(1200);
  await scrollToTop(page);
  await sleep(600);
}

async function captureSections(page: Page, width: number): Promise<void> {
  const sections: SectionInfo[] = await page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)].map((section, index) => ({
        index,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- an empty id must fall through to aria-label
        id: section.id || section.getAttribute("aria-label") || section.tagName.toLowerCase(),
      })),
    SECTION_SELECTOR,
  );
  for (const section of sections) {
    await tryStep(`${width} section ${section.id}`, async () => {
      const elements = await page.$$(SECTION_SELECTOR);
      const element = elements[section.index];
      if (!element) throw new Error(`section ${section.index} missing`);
      await element.evaluate((node) => {
        node.scrollIntoView({ block: "start" });
      });
      await sleep(900);
      await screenshot(page, `${width}-sec-${String(section.index).padStart(2, "0")}-${slug(section.id)}`);
    });
  }
}

async function captureStates(page: Page, width: number): Promise<void> {
  await tryStep(`${width} menu`, async () => {
    await page.click(".menu-btn");
    await sleep(1100);
    await screenshot(page, `${width}-state-menu`);
    await page.click(".menu-btn");
    await sleep(900);
  });
  await tryStep(`${width} modal`, async () => {
    await page.click(".hero .pill-btn-dark");
    await sleep(1100);
    await screenshot(page, `${width}-state-modal`);
    await page.keyboard.press("Escape");
    await sleep(800);
  });
  await tryStep(`${width} hero card next`, async () => {
    await page.click(".hero-card__arrow");
    await sleep(700);
    await screenshot(page, `${width}-state-herocard-next`);
  });
  await tryStep(`${width} accordion`, async () => {
    const row = await requireHandle(page, ".exp-row");
    await centerAndClickHandle(row, 900);
    await screenshot(page, `${width}-state-accordion-open`);
  });
  await tryStep(`${width} skills toggle`, async () => {
    const toggle = await page.$(".skills-flat__toggle");
    if (!toggle) return;
    await toggle.evaluate((node) => {
      node.scrollIntoView({ block: "center" });
    });
    await sleep(500);
    const isVisible = await toggle.evaluate((node) => (node as HTMLElement).offsetParent !== null);
    if (!isVisible) return;
    await toggle.click();
    await sleep(900);
    await screenshot(page, `${width}-state-skills-expanded`);
  });
  await tryStep(`${width} editorial`, async () => {
    const tabs = await page.$$(".editorial-tabs__btn");
    const secondTab = tabs[1];
    if (secondTab) {
      await centerAndClickHandle(secondTab, 1000);
      await screenshot(page, `${width}-state-editorial-tab2`);
    }
    const searchOrb = await page.$(".editorial-search__orb--search");
    if (searchOrb) {
      await searchOrb.click();
      await sleep(900);
      await page.keyboard.type(SEARCH_TERM);
      await sleep(900);
      await screenshot(page, `${width}-state-editorial-search`);
    }
  });
}

for (const width of WIDTHS) {
  const { page, errors } = await freshPage(width);
  await scrollThroughPage(page);
  await screenshot(page, `${width}-full`, true);
  await captureSections(page, width);
  await scrollToTop(page);
  await sleep(500);
  await captureStates(page, width);
  if (errors.length) log.push(`${width} console errors: ${JSON.stringify(errors)}`);
  await page.close();
}
await browser.close();
console.log(log.join("\n") || "no step errors");
