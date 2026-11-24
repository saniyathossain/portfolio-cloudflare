export interface ClockLabels {
  readonly meridiem: { readonly am: string; readonly pm: string };
  readonly monthNames: readonly string[];
  readonly dateSeparator: string;
}

export interface ClockReading {
  /** "9:41am" */
  readonly timeText: string;
  /** "12 March, 2025" */
  readonly dateText: string;
  readonly hourAngleDeg: number;
  readonly minuteAngleDeg: number;
  /** Only the reduced-motion static fallback uses this; the live second hand is a CSS animation. */
  readonly secondAngleDeg: number;
  /** Negative animation-delay that puts the CSS second-hand sweep in phase with the real second. */
  readonly secondSweepDelay: string;
}

const DEGREES_PER_HOUR = 30;
const DEGREES_PER_MINUTE = 6;
const DEGREES_PER_SECOND = 6;
const HOURS_ON_FACE = 12;

export function readClock(now: Date, labels: ClockLabels): ClockReading {
  const hours = now.getHours();
  const minuteText = String(now.getMinutes()).padStart(2, "0");
  const meridiem = hours < HOURS_ON_FACE ? labels.meridiem.am : labels.meridiem.pm;
  const hourOnFace = hours % HOURS_ON_FACE || HOURS_ON_FACE;
  const monthName = labels.monthNames[now.getMonth()] ?? "";

  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hoursWithFraction = (hours % HOURS_ON_FACE) + minutes / 60;

  return {
    timeText: `${hourOnFace}:${minuteText}${meridiem}`,
    dateText: `${now.getDate()} ${monthName}${labels.dateSeparator}${now.getFullYear()}`,
    hourAngleDeg: hoursWithFraction * DEGREES_PER_HOUR,
    minuteAngleDeg: minutes * DEGREES_PER_MINUTE,
    secondAngleDeg: seconds * DEGREES_PER_SECOND,
    secondSweepDelay: `-${seconds.toFixed(3)}s`,
  };
}
