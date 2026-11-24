import { useEffect, useState, type CSSProperties } from "react";
import { readClock, type ClockLabels, type ClockReading } from "../lib/clock";

interface HeaderClockProps {
  readonly ariaLabel: string;
  readonly labels: ClockLabels;
  readonly tickMs: number;
  /** Reading computed at build time — the first client render must match it, then the effect takes over. */
  readonly initialReading: ClockReading;
}

/** Analog + text clock in the header. Hands ease via CSS; the second hand is a CSS-only 60 s sweep set once. */
export default function HeaderClock({ ariaLabel, labels, tickMs, initialReading }: HeaderClockProps) {
  const [reading, setReading] = useState(initialReading);
  const [sweepDelay, setSweepDelay] = useState(initialReading.secondSweepDelay);

  useEffect(() => {
    const update = () => {
      setReading(readClock(new Date(), labels));
    };
    setSweepDelay(readClock(new Date(), labels).secondSweepDelay);
    update();
    const timerId = window.setInterval(update, tickMs);
    return () => {
      window.clearInterval(timerId);
    };
  }, [labels, tickMs]);

  const faceStyle = {
    "--clock-h": `${reading.hourAngleDeg}deg`,
    "--clock-m": `${reading.minuteAngleDeg}deg`,
    "--clock-s": `${reading.secondAngleDeg}deg`,
    "--clock-s-delay": sweepDelay,
  } as CSSProperties;

  return (
    <div className="clock-chip" aria-label={ariaLabel}>
      <span className="clock-face" aria-hidden="true" style={faceStyle}>
        <span className="clock-tick clock-tick--12" />
        <span className="clock-tick clock-tick--3" />
        <span className="clock-tick clock-tick--6" />
        <span className="clock-tick clock-tick--9" />
        <span className="clock-hand clock-hand--h" />
        <span className="clock-hand clock-hand--m" />
        <span className="clock-hand clock-hand--s" />
        <span className="clock-pin" />
      </span>
      <span className="clock-time">{reading.timeText}</span>
      <span className="clock-sep">•</span>
      <span className="clock-date">{reading.dateText}</span>
    </div>
  );
}
