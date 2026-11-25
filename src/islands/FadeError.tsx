import { useEffect, useRef, useState } from "preact/hooks";

type Phase = "hidden" | "enter-start" | "enter-end" | "shown" | "leave-start" | "leave-end";

interface FadeErrorProps {
  readonly message: string;
  readonly className: string;
  /** CSS class prefix of the transition triplets (`<prefix>-enter`, `-enter-start`, `-enter-end`, `-leave…`). */
  readonly transitionPrefix: string;
  readonly enterMs: number;
  readonly leaveMs: number;
}

/** Reproduces Alpine's x-show + x-transition:enter/leave class choreography for an alert paragraph. */
export default function FadeError({ message, className, transitionPrefix, enterMs, leaveMs }: FadeErrorProps) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const lastMessage = useRef(message);
  if (message) lastMessage.current = message;

  useEffect(() => {
    let frameId = 0;
    let timerId = 0;
    const afterFrames = (next: () => void) => {
      frameId = requestAnimationFrame(() => {
        frameId = requestAnimationFrame(next);
      });
    };
    if (message) {
      setPhase("enter-start");
      afterFrames(() => {
        setPhase("enter-end");
        timerId = window.setTimeout(() => {
          setPhase("shown");
        }, enterMs);
      });
    } else {
      setPhase((current) => (current === "hidden" ? current : "leave-start"));
      afterFrames(() => {
        setPhase((current) => (current === "hidden" ? current : "leave-end"));
        timerId = window.setTimeout(() => {
          setPhase("hidden");
        }, leaveMs);
      });
    }
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timerId);
    };
  }, [message, enterMs, leaveMs]);

  const transitionClasses: Record<Phase, string> = {
    hidden: "",
    "enter-start": `${transitionPrefix}-enter ${transitionPrefix}-enter-start`,
    "enter-end": `${transitionPrefix}-enter ${transitionPrefix}-enter-end`,
    shown: "",
    "leave-start": `${transitionPrefix}-leave ${transitionPrefix}-leave-start`,
    "leave-end": `${transitionPrefix}-leave ${transitionPrefix}-leave-end`,
  };
  const classes = [className, transitionClasses[phase]].filter(Boolean).join(" ");

  return (
    <p className={classes} role="alert" hidden={phase === "hidden"}>
      {lastMessage.current}
    </p>
  );
}
