import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import rawPortfolio from "../../public/assets/data/portfolio.json";
import { JsonContentRepository } from "../../src/repositories/ContentRepository";
import { BrandResolver } from "../../src/services/BrandResolver";
import { PortfolioService } from "../../src/services/PortfolioService";

interface LegacyBrand {
  label: string;
  color: string;
  raw: string;
  src: string | null;
  mono: string;
  fg: string;
}

interface LegacyData {
  brandOf: (name: string) => LegacyBrand;
  experienceGroups: Record<string, unknown>[];
  sections: Record<string, string>;
  site: { aboutHeading: string; aboutKicker: string };
  stats: { icon: string; value: number }[];
  partners: Record<string, unknown>[];
  profile: { phoneHref: string; heroRating: string };
  highlightExp: (text: string) => string;
}

interface LegacySandbox {
  window: unknown;
  fetch: () => Promise<never>;
  legacyHydrate?: (raw: unknown) => LegacyData;
}

/** Runs the shipped data.js in a sandbox so the TypeScript port can be checked against the real thing. */
function hydrateWithLegacyScript(): LegacyData {
  const scriptSource = readFileSync("public/assets/js/data.js", "utf8");
  const sandbox: LegacySandbox = { window: undefined, fetch: () => new Promise<never>(() => undefined) };
  sandbox.window = sandbox;
  runInNewContext(`${scriptSource}\nwindow.legacyHydrate = _hydrate;`, sandbox);
  if (!sandbox.legacyHydrate) throw new Error("legacy _hydrate was not exposed");
  return sandbox.legacyHydrate(structuredClone(rawPortfolio));
}

const legacyData = hydrateWithLegacyScript();
const contentRepository = new JsonContentRepository();
const brandResolver = new BrandResolver(contentRepository.brands(), contentRepository.ui());
const portfolioService = new PortfolioService(contentRepository);
const portfolioView = portfolioService.build();

describe("TypeScript port matches legacy data.js", () => {
  it("resolves every stack brand identically", () => {
    const stackNames = new Set([
      ...rawPortfolio.skills.flatMap((group) => group.items),
      ...rawPortfolio.experiences.flatMap((experience) => [...experience.stacks, ...experience.aiTools]),
      "Unknown Tool",
    ]);
    for (const stackName of stackNames) {
      const legacy = legacyData.brandOf(stackName);
      expect(brandResolver.resolve(stackName), stackName).toEqual({
        label: legacy.label,
        color: legacy.color,
        rawColor: legacy.raw,
        iconSrc: legacy.src,
        monogram: legacy.mono,
        foreground: legacy.fg,
      });
    }
  });

  it("groups experiences and tenures identically", () => {
    const legacyGroups = JSON.parse(JSON.stringify(legacyData.experienceGroups)) as unknown;
    const portView = JSON.parse(JSON.stringify(portfolioView.experienceGroups)) as unknown;
    expect(portView).toEqual(legacyGroups);
  });

  it("derives the same section copy, stats and partners", () => {
    expect(portfolioView.sections).toEqual(legacyData.sections);
    expect(portfolioView.site.aboutHeading).toBe(legacyData.site.aboutHeading);
    expect(portfolioView.site.aboutKicker).toBe(legacyData.site.aboutKicker);
    expect(portfolioView.stats.map((stat) => stat.value)).toEqual(legacyData.stats.map((stat) => stat.value));
    expect(JSON.parse(JSON.stringify(portfolioView.partners))).toEqual(JSON.parse(JSON.stringify(legacyData.partners)));
    expect(portfolioView.phoneHref).toBe(legacyData.profile.phoneHref);
    expect(portfolioView.heroRating).toBe(legacyData.profile.heroRating);
  });

  it("highlights experience terms identically", () => {
    for (const experience of rawPortfolio.experiences) {
      for (const detail of [experience.summary, ...experience.details]) {
        expect(portfolioService.highlightExperience(detail)).toBe(legacyData.highlightExp(detail));
      }
    }
  });
});
