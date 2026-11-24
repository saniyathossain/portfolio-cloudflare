import { tenureOfPeriods } from "../lib/tenure";
import type { Employment, ExperienceGroup, RoleView } from "../types/ExperienceGroup";
import type { UiConfig } from "../types/UiConfig";
import type { Experience, Portfolio } from "../types/Portfolio";

/** "Senior Engineer — (Contract)" → "Senior Engineer": the employment badge carries that information. */
export function cleanRoleTitle(role: string): string {
  return role.replace(/\s*[—–-]?\s*\((Contract|Permanent)\)\s*/gi, "").trim();
}

function employmentOf(experience: Experience, ui: UiConfig): Employment {
  const view = ui.employmentTypes[experience.employmentType];
  return { type: experience.employmentType, label: view.label, icon: view.icon };
}

export function toRoleView(experience: Experience, ui: UiConfig): RoleView {
  return {
    ...experience,
    roleDisplay: cleanRoleTitle(experience.role),
    employment: employmentOf(experience, ui),
  };
}

function groupRolesByCompany(experiences: readonly Experience[], ui: UiConfig): Map<string, RoleView[]> {
  const rolesByCompany = new Map<string, RoleView[]>();
  for (const experience of experiences) {
    const roles = rolesByCompany.get(experience.companySlug) ?? [];
    roles.push(toRoleView(experience, ui));
    rolesByCompany.set(experience.companySlug, roles);
  }
  return rolesByCompany;
}

export function groupExperiencesByCompany(
  portfolio: Pick<Portfolio, "experiences" | "companies">,
  ui: UiConfig,
  now: Date,
): ExperienceGroup[] {
  const rolesByCompany = groupRolesByCompany(portfolio.experiences, ui);
  return [...rolesByCompany].map(([slug, roles]) => {
    const company = portfolio.companies[slug];
    return {
      slug,
      company: company?.name ?? slug,
      logo: company?.logo,
      location: company?.location,
      color: company?.color,
      website: company?.website,
      roles,
      companyTenure: tenureOfPeriods(
        roles.map((role) => role.period),
        now,
      ),
    };
  });
}
