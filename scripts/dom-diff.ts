/**
 * Normalises the DOM under SELECTOR on two URLs and writes `<OUT>.before.txt` / `<OUT>.after.txt`; prints IDENTICAL
 * or DIFFERENT. CLICK is a `|`-separated list of selectors clicked in order before capturing.
 *   A=http://127.0.0.1:8802/ B=http://127.0.0.1:8803/ SELECTOR=main OUT=/tmp/diff [CLICK=".exp-row"] [ALLOW_MOTION=1] node scripts/dom-diff.ts
 */
import { writeFileSync } from "node:fs";
import type { Browser } from "puppeteer-core";
import { centerAndClickHandle, launchBrowser, READY_SELECTOR, READY_TIMEOUT_MS, requireEnv, sleep } from "./lib/browser.ts";

const URL_BEFORE = requireEnv("A");
const URL_AFTER = requireEnv("B");
const SELECTOR = requireEnv("SELECTOR");
const OUT = requireEnv("OUT");
const ALLOW_MOTION = Boolean(process.env["ALLOW_MOTION"]);
const CLICK_SELECTORS = (process.env["CLICK"] ?? "").split("|").filter(Boolean);
const VIEWPORT = { width: 1440, height: 900 };
const AFTER_LOAD_MS = 4000;
const AFTER_CLICK_MS = 1800;
const ATTRIBUTE_VALUE_LIMIT = 90;

async function normalized(browser: Browser, url: string): Promise<string> {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  if (!ALLOW_MOTION) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForSelector(READY_SELECTOR, { timeout: READY_TIMEOUT_MS }).catch(() => undefined);
  await sleep(AFTER_LOAD_MS);
  for (const clickSelector of CLICK_SELECTORS) {
    const target = await page.$(clickSelector);
    if (!target) throw new Error(`CLICK target not found: ${clickSelector}`);
    await centerAndClickHandle(target, AFTER_CLICK_MS);
  }
  const html = await page.evaluate(
    (selector, valueLimit) => {
      const root = document.querySelector(selector);
      if (!root) return `MISSING ${selector}`;
      const clone = root.cloneNode(true) as Element;
      clone.querySelectorAll('template, script[type="text/html"]').forEach((node) => {
        node.remove();
      });
      // React islands are wrapped in <astro-island> (display: contents) — transparent to layout, so unwrap it.
      for (const island of [...clone.querySelectorAll("astro-island")]) island.replaceWith(...island.childNodes);
      // The first island injects Astro's hydration runtime (<style>/<script>) next to it — not page content.
      clone.querySelectorAll("script, style").forEach((node) => {
        node.remove();
      });
      const volatileClass = /^(is-[a-z-]+|in-view|revealed)$/;
      const isVolatileAttribute = (name: string): boolean =>
        name.startsWith("x-") ||
        name.startsWith(":") ||
        name.startsWith("@") ||
        name === "style" ||
        name.startsWith("data-tenure") ||
        name === "data-copyright-template";
      const normalizeElement = (element: Element): void => {
        for (const attribute of [...element.attributes]) {
          if (isVolatileAttribute(attribute.name)) element.removeAttribute(attribute.name);
        }
        if (!element.classList.length) return;
        const kept = [...element.classList].filter((className) => !volatileClass.test(className));
        if (kept.length) element.setAttribute("class", kept.join(" "));
        else element.removeAttribute("class");
      };
      for (const element of [clone, ...clone.querySelectorAll("*")]) normalizeElement(element);
      const lines: string[] = [];
      const walk = (node: Node, depth: number): void => {
        if (node.nodeType === Node.TEXT_NODE) {
          const textContent = (node.textContent ?? "").replace(/\s+/g, " ").trim();
          if (textContent) lines.push("  ".repeat(depth) + JSON.stringify(textContent));
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const element = node as Element;
        const attributes = [...element.attributes]
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((attribute) => `${attribute.name}="${attribute.value.length > valueLimit ? `${attribute.value.slice(0, valueLimit)}…` : attribute.value}"`)
          .join(" ");
        lines.push(`${"  ".repeat(depth)}<${element.tagName.toLowerCase()}${attributes ? ` ${attributes}` : ""}>`);
        node.childNodes.forEach((child) => {
          walk(child, depth + 1);
        });
      };
      walk(clone, 0);
      return lines.join("\n");
    },
    SELECTOR,
    ATTRIBUTE_VALUE_LIMIT,
  );
  await page.close();
  return html;
}

const browser = await launchBrowser();
const before = await normalized(browser, URL_BEFORE);
const after = await normalized(browser, URL_AFTER);
writeFileSync(`${OUT}.before.txt`, `${before}\n`);
writeFileSync(`${OUT}.after.txt`, `${after}\n`);
await browser.close();
console.log(before === after ? `IDENTICAL (${before.split("\n").length} lines)` : "DIFFERENT");
