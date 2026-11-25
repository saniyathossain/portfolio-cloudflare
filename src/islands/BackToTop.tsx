import { useEffect, useState } from "preact/hooks";
import { scrollToTop } from "../lib/browser/scroll";

interface BackToTopProps {
  /** Pre-rendered icon SVG (the same markup the static page uses). */
  readonly iconHtml: string;
  readonly ariaLabel: string;
  readonly revealAfterPx: number;
}

/**
 * Floating "scroll to top" control. An invisible marker at the top of the page, as tall as the reveal distance, is watched
 * with an IntersectionObserver: the button shows once the marker has scrolled out of view. No scroll listener and no
 * `scrollY` read, so mounting never forces a synchronous layout (PageSpeed "forced reflow").
 */
export default function BackToTop({ iconHtml, ariaLabel, revealAfterPx }: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const marker = document.createElement("div");
    marker.className = "back-to-top-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.style.setProperty("--reveal-after", `${String(revealAfterPx)}px`);
    document.body.prepend(marker);
    const observer = new IntersectionObserver((entries) => {
      const latest = entries[entries.length - 1];
      if (latest) setIsVisible(!latest.isIntersecting);
    });
    observer.observe(marker);
    return () => {
      observer.disconnect();
      marker.remove();
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
