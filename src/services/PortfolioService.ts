import { fillTemplate, highlightTerms } from "../lib/text";
import { wholeYearsSince } from "../lib/tenure";
import type { ContentRepository } from "../repositories/ContentRepository";
import type { ExperienceGroup } from "../types/ExperienceGroup";
import type { Portfolio, Stat } from "../types/Portfolio";
import type { UiConfig } from "../types/UiConfig";
import type { PartnerView, PortfolioView } from "../types/PortfolioView";
import { groupExperiencesByCompany } from "./ExperienceGrouper";

interface TemplateCounts {
  readonly years: number;
  readonly roles: number;
  readonly companies: number;
}

function toPartnerViews(
  groups: readonly ExperienceGroup[],
  fallback: Portfolio["partners"],
  neutralColor: string,
): PartnerView[] {
  if (groups.length === 0) {
    return fallback.map((partner) => ({
      name: partner.name,
      logo: partner.logo,
      slug: partner.name,
      color: neutralColor,
      website: undefined,
    }));
  }
  return groups.map((group) => ({
    name: group.company,
    logo: group.logo,
    slug: group.slug,
    color: group.color ?? neutralColor,
    website: group.website,
  }));
}

function withDerivedStatValues(
  stats: readonly Stat[],
  counts: TemplateCounts,
  derived: UiConfig["derivedStats"],
): Stat[] {
  return stats.map((stat) => {
    if (stat.icon === derived.yearsOfExperienceIcon) return { ...stat, value: counts.years };
    if (stat.icon === derived.companyCountIcon) return { ...stat, value: counts.companies };
    return stat;
  });
}

/** Education subtitle comes from the top degree, so it cannot go stale: "Subject — City." */
function educationSubtitle(education: Portfolio["education"], fallback: string): string {
  const topDegree = education[0];
  if (!topDegree) return fallback;
  const city = topDegree.place.split(",")[0]?.trim() ?? "";
  return `${topDegree.subject}${city ? ` — ${city}` : ""}.`;
}

export class PortfolioService {
  constructor(
    private readonly repository: ContentRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  build(): PortfolioView {
    const portfolio = this.repository.portfolio();
    const ui = this.repository.ui();
    const now = this.clock();
    const experienceGroups = groupExperiencesByCompany(portfolio, ui, now);
    const counts: TemplateCounts = {
      years: wholeYearsSince(portfolio.profile.experienceStartDate, portfolio.profile.experienceYearsOffset, now),
      roles: portfolio.experiences.length,
      companies: experienceGroups.length,
    };

    return {
      ...portfolio,
      site: {
        ...portfolio.site,
        aboutHeading: fillTemplate(portfolio.site.aboutHeading, { ...counts }),
        aboutKicker: fillTemplate(portfolio.site.aboutKicker, { ...counts }),
      },
      sections: {
        ...portfolio.sections,
        experience: fillTemplate(portfolio.sections.experience, { ...counts }),
        education: educationSubtitle(portfolio.education, portfolio.sections.education),
      },
      stats: withDerivedStatValues(portfolio.stats, counts, ui.derivedStats),
      partners: toPartnerViews(experienceGroups, portfolio.partners, ui.partnerFallbackColor),
      experienceGroups,
      currentYear: now.getFullYear(),
      phoneHref: portfolio.profile.phone.replace(/[^\d+]/g, ""),
      heroRating: portfolio.profile.heroRatingTail,
    };
  }

  /** Wraps the configured stack terms of an experience detail line in highlight markup. */
  highlightExperience(text: string): string {
    return highlightTerms(text, this.repository.portfolio().site.experienceHighlights);
  }
}
