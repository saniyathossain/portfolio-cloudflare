import { tenureOfPeriod, tenureOfPeriods } from "../lib/tenure";

/**
 * The page is rendered at build time, but "Present" tenures and the footer year must stay accurate
 * without a rebuild. This refreshes just those labels in the browser (the build-time text is the fallback).
 */
function refreshLiveDates(now: Date): void {
  for (const element of document.querySelectorAll<HTMLElement>("[data-tenure-period]")) {
    const period = element.getAttribute("data-tenure-period");
    if (period) element.textContent = tenureOfPeriod(period, now).label;
  }
  for (const element of document.querySelectorAll<HTMLElement>("[data-tenure-periods]")) {
    const periods = parsePeriodList(element.getAttribute("data-tenure-periods"));
    if (periods.length > 0) element.textContent = tenureOfPeriods(periods, now).label;
  }
  for (const element of document.querySelectorAll<HTMLElement>("[data-copyright-template]")) {
    const template = element.getAttribute("data-copyright-template");
    if (template) element.textContent = template.replace("{year}", String(now.getFullYear()));
  }
}

function parsePeriodList(serialized: string | null | undefined): string[] {
  if (!serialized) return [];
  const parsed: unknown = JSON.parse(serialized);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((entry): entry is string => typeof entry === "string");
}

refreshLiveDates(new Date());
