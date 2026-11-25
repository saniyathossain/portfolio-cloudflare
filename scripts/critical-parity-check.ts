#!/usr/bin/env node
/**
 * Critical-CSS parity guard: the inlined critical CSS is what paints first; the full stylesheet arrives later. If the
 * two disagree about layout, the page jumps when the stylesheet lands (layout shift). This loads the page with
 * styles.min.css held back for STYLESHEET_DELAY_MS, measures every above-the-fold landmark while only the critical CSS
 * is applied, then again once the full stylesheet has landed, and compares the two.
 *   BASE=http://127.0.0.1:8800/ node scripts/critical-parity-check.ts   (exit 1 when any box differs by more than TOLERANCE_PX)
 */
import type { Page } from "puppeteer-core";
import { launchBrowser, requireEnv, sleep } from "./lib/browser.ts";
import { logDone, logWarn } from "./lib/console.ts";

const BASE = requireEnv("BASE");
const STYLESHEET_DELAY_MS = 3000;
const CRITICAL_ONLY_AT_MS = 1800;
const FULL_AT_MS = 5500;
const TOLERANCE_PX = 3;
const VIEWPORTS: readonly (readonly [number, number])[] = [
  [1350, 940],
  [768, 1024],
  [390, 844],
];
const LANDMARKS = [
  ".site-header .glass-pill",
  ".hero__copy",
  ".hero__copy .eyebrow",
  ".hero h1",
  ".hero__actions",
  ".hero__aside",
  ".hero-card",
  ".hero-partners",
  ".hero__wm",
] as const;

type Boxes = Record<string, readonly [number, number, number, number] | null>;

async function measure(page: Page): Promise<Boxes> {
  return page.evaluate((selectors) => {
    const result: Record<string, [number, number, number, number] | null> = {};
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) {
        result[selector] = null;
        continue;
      }
      const box = element.getBoundingClientRect();
      result[selector] = [Math.round(box.left * 10) / 10, Math.round(box.top * 10) / 10, Math.round(box.width * 10) / 10, Math.round(box.height * 10) / 10];
    }
    return result;
  }, [...LANDMARKS]);
}

const browser = await launchBrowser();
let failures = 0;
for (const [width, height] of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.url().includes("styles.min.css")) setTimeout(() => void request.continue(), STYLESHEET_DELAY_MS);
    else void request.continue();
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await sleep(CRITICAL_ONLY_AT_MS);
  // Web fonts are part of the critical state too: measuring before Inter has settled would flag a font swap, not a CSS gap.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const criticalOnly = await measure(page);
  await sleep(FULL_AT_MS - CRITICAL_ONLY_AT_MS);
  const full = await measure(page);
  await page.close();
  for (const selector of LANDMARKS) {
    const before = criticalOnly[selector];
    const after = full[selector];
    if (!before || !after) continue;
    const worst = Math.max(...before.map((value, index) => Math.abs(value - (after[index] ?? 0))));
    if (worst > TOLERANCE_PX) {
      failures++;
      logWarn(`critical parity ${String(width)}px  ${selector}  critical-only ${before.join(",")}  full ${after.join(",")}`);
    }
  }
}
await browser.close();
if (failures > 0) {
  logWarn(`critical parity: ${String(failures)} landmark(s) move when the full stylesheet loads`);
  process.exit(1);
}
logDone("critical parity: above-the-fold layout identical before and after the full stylesheet");
