import type { ExperienceGroup } from "./ExperienceGroup";
import type { Portfolio, Stat } from "./Portfolio";

export interface PartnerView {
  readonly name: string;
  readonly logo: string | undefined;
  readonly slug: string;
  readonly color: string;
  readonly website: string | undefined;
}

/** The validated content plus everything derived from it at build time. */
export interface PortfolioView extends Omit<Portfolio, "stats" | "partners"> {
  readonly stats: readonly Stat[];
  readonly partners: readonly PartnerView[];
  readonly experienceGroups: readonly ExperienceGroup[];
  readonly currentYear: number;
  readonly phoneHref: string;
  readonly heroRating: string;
}
