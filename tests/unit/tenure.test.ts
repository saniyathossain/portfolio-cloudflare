import { describe, expect, it } from "vitest";
import {
  formatTenureMonths,
  parseMonthYear,
  tenureOfPeriod,
  tenureOfPeriods,
  wholeYearsSince,
} from "../../src/lib/tenure";

const referenceDate = new Date(2026, 10, 24);

describe("tenure", () => {
  it("parses month-year text and rejects anything else", () => {
    expect(parseMonthYear("Jan 2025")?.getMonth()).toBe(0);
    expect(parseMonthYear("Sept 2020")?.getMonth()).toBe(8);
    expect(parseMonthYear("2025")).toBeNull();
    expect(parseMonthYear("Foo 2025")).toBeNull();
  });

  it("formats years, months and mixed labels", () => {
    expect(formatTenureMonths(24).label).toBe("2 years");
    expect(formatTenureMonths(63).label).toBe("5 years 3 months");
    expect(formatTenureMonths(5).label).toBe("5 months");
    expect(formatTenureMonths(0).label).toBe("1 month");
  });

  it("counts both end months and treats Present as now", () => {
    expect(tenureOfPeriod("Jan 2025 — Present", referenceDate).totalMonths).toBe(23);
    expect(tenureOfPeriod("Oct 2020 — Dec 2021", referenceDate).totalMonths).toBe(15);
    expect(tenureOfPeriod("nonsense", referenceDate).label).toBe("—");
  });

  it("sums several periods for a company", () => {
    expect(tenureOfPeriods(["Jan 2020 — Dec 2020", "Jan 2021 — Dec 2021"], referenceDate).label).toBe("2 years");
    expect(tenureOfPeriods([], referenceDate).label).toBe("—");
  });

  it("counts whole years like a birthday", () => {
    expect(wholeYearsSince("2012-09-01", 0, referenceDate)).toBe(14);
    expect(wholeYearsSince("2012-12-01", 0, referenceDate)).toBe(13);
    expect(wholeYearsSince("2012-09-01", 2, referenceDate)).toBe(12);
    expect(wholeYearsSince("bad", 0, referenceDate)).toBe(0);
  });
});
