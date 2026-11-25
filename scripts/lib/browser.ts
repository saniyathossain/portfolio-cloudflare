/** Shared helpers for the Puppeteer verification / measurement scripts (run directly by Node's type stripping). */
import puppeteer from "puppeteer-core";
import type { Browser, ElementHandle } from "puppeteer-core";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const READY_SELECTOR = "html.is-ready";
export const READY_TIMEOUT_MS = 15_000;
export const SCROLL_SETTLE_MS = 500;
/** content-visibility:auto skips off-screen sections, which would zero their measured height. */
export const FORCE_VISIBLE_CSS = ".sec { content-visibility: visible !important; }";

export const sleep = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Reads a required environment variable; fails with a readable message instead of passing `undefined` on. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") throw new Error(`Environment variable ${name} is required`);
  return value;
}

export function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
}

/** Scrolls the element to the middle of the viewport, waits for smooth scroll to settle, then clicks it. */
export async function centerAndClickHandle(handle: ElementHandle, afterClickMs = 0, scrollSettleMs = SCROLL_SETTLE_MS): Promise<void> {
  await handle.evaluate((element) => {
    element.scrollIntoView({ block: "center" });
  });
  await sleep(scrollSettleMs);
  await handle.click();
  if (afterClickMs > 0) await sleep(afterClickMs);
}
