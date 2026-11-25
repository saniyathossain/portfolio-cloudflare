/**
 * Responsive sanity sweep: horizontal overflow, header overlap and the exact experience → skills gap at many widths.
 *   BASE=http://127.0.0.1:8803/ [WIDTHS=320,360,...] node scripts/responsive-check.ts   (exit 1 on overflow)
 */
import { launchBrowser, requireEnv, sleep } from "./lib/browser.ts";

const BASE = requireEnv("BASE");
const WIDTHS = (process.env["WIDTHS"] ?? "320,360,390,430,600,768,900,1024,1280,1440,1920,2560").split(",").map(Number);
const VIEWPORT_HEIGHT_PX = 900;
const AFTER_LOAD_MS = 2200;
const OVERFLOW_TOLERANCE_PX = 1;
const MAX_REPORTED_OVERFLOWS = 3;
const CLASS_NAME_PREVIEW_LENGTH = 24;
const IGNORED_OVERFLOW_ANCESTORS =
  ".hero__backdrop, [data-parallax], .aurora, .nav-overlay, .modal-backdrop, .skills-flat__panel, [aria-hidden='true']";
const WIDTH_COLUMN = 5;
const HSCROLL_COLUMN = 11;
const GAP_COLUMN = 16;

interface ResponsiveResult {
  horizontalScroll: number;
  gapAfterExperience: number;
  overflowing: string[];
}

const browser = await launchBrowser();
let failed = false;
for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: VIEWPORT_HEIGHT_PX });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(AFTER_LOAD_MS);
  const result: ResponsiveResult = await page.evaluate(
    (tolerance, maxReported, previewLength, ignoredAncestors) => {
      const documentTop = (element: HTMLElement): number => {
        let sum = 0;
        for (let node: Element | null = element; node instanceof HTMLElement; node = node.offsetParent) sum += node.offsetTop;
        return sum;
      };
      const requireElement = (selector: string): HTMLElement => {
        const found = document.querySelector<HTMLElement>(selector);
        if (!found) throw new Error(`Missing ${selector}`);
        return found;
      };
      const list = requireElement("#experience .exp-list");
      const skillsHeading = requireElement("#skills h2");
      const gapAfterExperience = documentTop(skillsHeading) - (documentTop(list) + list.offsetHeight);
      const overflowing = [...document.querySelectorAll("main *, header *, footer *")]
        .filter(
          (element) =>
            element.getBoundingClientRect().right > document.documentElement.clientWidth + tolerance &&
            getComputedStyle(element).position !== "fixed" &&
            !element.closest(ignoredAncestors),
        )
        .slice(0, maxReported)
        // SVG elements expose className as an object, so keep the String() coercion
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
        .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, previewLength)}`);
      return {
        horizontalScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        gapAfterExperience: Math.round(gapAfterExperience),
        overflowing,
      };
    },
    OVERFLOW_TOLERANCE_PX,
    MAX_REPORTED_OVERFLOWS,
    CLASS_NAME_PREVIEW_LENGTH,
    IGNORED_OVERFLOW_ANCESTORS,
  );
  const isBad = result.horizontalScroll > OVERFLOW_TOLERANCE_PX || result.overflowing.length > 0;
  if (isBad) failed = true;
  console.log(
    String(width).padStart(WIDTH_COLUMN),
    `hscroll=${result.horizontalScroll}`.padEnd(HSCROLL_COLUMN),
    `exp→skills=${result.gapAfterExperience}`.padEnd(GAP_COLUMN),
    result.overflowing.length ? `OVERFLOW ${result.overflowing.join(", ")}` : "ok",
  );
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
