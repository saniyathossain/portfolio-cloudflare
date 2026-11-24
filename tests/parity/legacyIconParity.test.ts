import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { JsonContentRepository } from "../../src/repositories/ContentRepository";
import { IconService } from "../../src/services/IconService";

interface LegacyIconSandbox {
  window: unknown;
  iconSvg?: (name: string, className?: string) => string;
}

function loadLegacyIconRenderer(): (name: string, className?: string) => string {
  const scriptSource = readFileSync("public/assets/js/icons.js", "utf8");
  const sandbox: LegacyIconSandbox = { window: undefined };
  sandbox.window = sandbox;
  runInNewContext(scriptSource, sandbox);
  if (!sandbox.iconSvg) throw new Error("legacy iconSvg was not exposed");
  return sandbox.iconSvg;
}

const contentRepository = new JsonContentRepository();
const catalog = contentRepository.icons();
const iconService = new IconService(catalog, contentRepository.ui().fallbackIconName);
const legacyRender = loadLegacyIconRenderer();

const classNames = ["", "ui-icon ui-icon--md", "ui-icon ui-icon--sm ui-icon--on-ink", "custom"];
const iconNames = [...Object.keys(catalog.aliases), ...Object.keys(catalog.lucide), "definitely-unknown"];

describe("IconService matches legacy window.iconSvg", () => {
  it.each(iconNames)("renders %s identically for every class variant", (iconName) => {
    for (const className of classNames) {
      expect(iconService.render(iconName, className), `${iconName} / "${className}"`).toBe(
        legacyRender(iconName, className),
      );
    }
  });
});
