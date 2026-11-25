import type { EmploymentType } from "../enums/EmploymentType";
import type { Experience } from "./Portfolio";
import type { Tenure } from "../lib/tenure";

export interface Employment {
  readonly type: EmploymentType;
  readonly label: string;
  readonly icon: string;
}

/** An experience entry plus the display fields derived from it. */
export interface RoleView extends Experience {
  readonly roleDisplay: string;
  readonly employment: Employment;
}

/** All roles held at one company, in source order. */
export interface ExperienceGroup {
  readonly slug: string;
  readonly company: string;
  readonly logo: string | undefined;
  readonly location: string | undefined;
  readonly color: string | undefined;
  readonly website: string | undefined;
  readonly roles: readonly RoleView[];
  readonly companyTenure: Tenure;
}
