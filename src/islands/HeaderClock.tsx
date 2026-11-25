import { useEffect, useRef, useState } from "preact/hooks";
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

  // Hand angles are derived from the current time, so they are written onto the face at runtime (no inline style attribute).
  const faceRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const face = faceRef.current;
    if (!face) return;
    face.style.setProperty("--clock-h", `${reading.hourAngleDeg}deg`);
    face.style.setProperty("--clock-m", `${reading.minuteAngleDeg}deg`);
    face.style.setProperty("--clock-s", `${reading.secondAngleDeg}deg`);
    face.style.setProperty("--clock-s-delay", sweepDelay);
  }, [reading, sweepDelay]);

  return (
    <div className="clock-chip" aria-label={ariaLabel}>
      <span className="clock-face" aria-hidden="true" ref={faceRef}>
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
