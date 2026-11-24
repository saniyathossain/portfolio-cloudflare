import { useEffect, useState } from "react";
import { scrollToTop } from "../lib/browser/scroll";

interface BackToTopProps {
  /** Pre-rendered icon SVG (the same markup the static page uses). */
  readonly iconHtml: string;
  readonly ariaLabel: string;
  readonly revealAfterPx: number;
}

/** Floating "scroll to top" control. One rAF-coalesced threshold check per frame, never per scroll event. */
export default function BackToTop({ iconHtml, ariaLabel, revealAfterPx }: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frameId = 0;
    const check = () => {
      frameId = 0;
      setIsVisible(window.scrollY > revealAfterPx);
    };
    const schedule = () => {
      if (!frameId) frameId = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    check();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frameId);
    };
  }, [revealAfterPx]);

  return (
    <button
      type="button"
      className={isVisible ? "back-to-top is-visible" : "back-to-top"}
      tabIndex={isVisible ? 0 : -1}
      onClick={scrollToTop}
      aria-label={ariaLabel}
    >
      <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: iconHtml }} />
    </button>
  );
}
