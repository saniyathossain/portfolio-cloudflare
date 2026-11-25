import { describe, expect, it } from "vitest";
import { readClock, type ClockLabels } from "../../src/lib/clock";

const labels: ClockLabels = {
  meridiem: { am: "am", pm: "pm" },
  monthNames: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  dateSeparator: ", ",
};

describe("readClock", () => {
  it("formats 12-hour time and the long date like the legacy header clock", () => {
    const reading = readClock(new Date(2025, 2, 12, 9, 41, 0), labels);
    expect(reading.timeText).toBe("9:41am");
    expect(reading.dateText).toBe("12 March, 2025");
  });

  it("uses 12 for midnight and noon, and pm after noon", () => {
    expect(readClock(new Date(2026, 0, 1, 0, 5, 0), labels).timeText).toBe("12:05am");
    expect(readClock(new Date(2026, 0, 1, 12, 0, 0), labels).timeText).toBe("12:00pm");
    expect(readClock(new Date(2026, 0, 1, 15, 7, 0), labels).timeText).toBe("3:07pm");
  });

  it("computes hand angles that include the fractional minutes and seconds", () => {
    const reading = readClock(new Date(2026, 5, 1, 3, 30, 30, 0), labels);
    expect(reading.hourAngleDeg).toBeCloseTo((3 + 30.5 / 60) * 30, 5);
    expect(reading.minuteAngleDeg).toBeCloseTo(30.5 * 6, 5);
    expect(reading.secondAngleDeg).toBeCloseTo(30 * 6, 5);
  });

  it("phases the CSS second-hand sweep with the real second", () => {
    expect(readClock(new Date(2026, 5, 1, 3, 30, 12, 500), labels).secondSweepDelay).toBe("-12.500s");
  });
});
