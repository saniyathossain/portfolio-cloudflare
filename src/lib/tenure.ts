import { pluralize } from "./text";

export interface Tenure {
  readonly years: number;
  readonly months: number;
  readonly totalMonths: number;
  readonly label: string;
}

const EMPTY_TENURE: Tenure = { years: 0, months: 0, totalMonths: 0, label: "—" };

const MONTH_INDEX_BY_PREFIX: Readonly<Record<string, number>> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Parses "Jan 2025" into the first of that month; null when the text is not "Mon YYYY". */
export function parseMonthYear(text: string): Date | null {
  const match = /^([A-Za-z]+)\s+(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [, monthName = "", yearText = ""] = match;
  const monthIndex = MONTH_INDEX_BY_PREFIX[monthName.toLowerCase().slice(0, 3)];
  if (monthIndex === undefined) return null;
  return new Date(parseInt(yearText, 10), monthIndex, 1);
}

/**
 * "5 years 3 months" when there is a remainder, "2 years" for an exact multiple of 12, and months only for a
 * sub-year stint — never a misleading "1 year" or "0 years".
 */
export function formatTenureMonths(requestedMonths: number): Tenure {
  const totalMonths = Math.max(1, requestedMonths);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years < 1) return { years, months, totalMonths, label: pluralize(months, "month") };
  const label = months > 0 ? `${pluralize(years, "year")} ${pluralize(months, "month")}` : pluralize(years, "year");
  return { years, months, totalMonths, label };
}

/** Tenure of a "Jan 2025 — Present" style period; "Present" counts up to `now`. */
export function tenureOfPeriod(period: string, now: Date): Tenure {
  const parts = period.split(/\s*[—–-]\s*/);
  const [startText, endText] = parts;
  if (parts.length < 2 || startText === undefined || endText === undefined) return EMPTY_TENURE;
  const start = parseMonthYear(startText);
  const end = /^present$/i.test(endText.trim()) ? now : parseMonthYear(endText);
  if (!start || !end) return EMPTY_TENURE;
  const monthSpan = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return formatTenureMonths(monthSpan);
}

export function tenureOfPeriods(periods: readonly string[], now: Date): Tenure {
  const totalMonths = periods.reduce((sum, period) => sum + tenureOfPeriod(period, now).totalMonths, 0);
  return totalMonths === 0 ? EMPTY_TENURE : formatTenureMonths(totalMonths);
}

/** Education dates are year-precision only, so the duration is years-only. */
export function tenureOfYears(startYear: number, endYear: number): { readonly years: number; readonly label: string } {
  const years = Math.max(1, endYear - startYear);
  return { years, label: pluralize(years, "year") };
}

/** Whole calendar years since `startDate` (YYYY-MM-DD), minus an offset — birthday-style, never over-counts. */
export function wholeYearsSince(startDate: string, offsetYears: number, now: Date): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!match) return 0;
  const [, yearText = "", monthText = "", dayText = ""] = match;
  const start = new Date(parseInt(yearText, 10), parseInt(monthText, 10) - 1, parseInt(dayText, 10));
  const anniversaryNotReached =
    now.getMonth() < start.getMonth() || (now.getMonth() === start.getMonth() && now.getDate() < start.getDate());
  const years = now.getFullYear() - start.getFullYear() - (anniversaryNotReached ? 1 : 0);
  return Math.max(0, years - offsetYears);
}
