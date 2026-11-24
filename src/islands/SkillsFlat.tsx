import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { animateHeight } from "../lib/browser/heightAnimation";
import { hiddenPillCount, isPillVisible, isToggleShown, mobileQuery, type SkillsFlatView } from "../lib/skillsFlat";

export interface SkillsFlatSettings {
  readonly collapsedLimit: number;
  readonly mobileMaxWidthPx: number;
  readonly openMs: number;
  readonly closeMs: number;
  readonly settleMarginMs: number;
  readonly easing: string;
  readonly reducedMotionQuery: string;
}

interface SkillsFlatProps {
  /** Number of server-rendered pills in `#skills-flat-panel` (already one per logo). */
  readonly totalPills: number;
  readonly viewMoreLabel: string;
  readonly viewLessLabel: string;
  /** Pre-rendered chevron SVG (same markup the static page uses). */
  readonly chevronHtml: string;
  readonly settings: SkillsFlatSettings;
}

const PANEL_ID = "skills-flat-panel";
const INNER_SELECTOR = ".skills-flat__inner";
const PILL_SELECTOR = ".skills-flat__pill";

function findPanel(): { panel: HTMLElement; inner: HTMLElement } | null {
  const panel = document.getElementById(PANEL_ID);
  const inner = panel?.querySelector<HTMLElement>(INNER_SELECTOR);
  return panel && inner ? { panel, inner } : null;
}

/**
 * Mobile "View more" accordion for the Tools & craft strip. The pills and panel are static Astro markup; this
 * island owns the toggle button and drives pill visibility, the `is-open` class and the panel height imperatively
 * (motion.ts / pillReflow hold references to the same nodes).
 */
export default function SkillsFlat({
  totalPills,
  viewMoreLabel,
  viewLessLabel,
  chevronHtml,
  settings,
}: SkillsFlatProps) {
  const [view, setView] = useState<SkillsFlatView>({ isMobile: false, isOpen: false });
  const viewRef = useRef(view);
  viewRef.current = view;

  const applyPillVisibility = useCallback(
    (next: SkillsFlatView) => {
      const elements = findPanel();
      if (!elements) return;
      elements.panel.classList.toggle("is-open", next.isOpen);
      elements.panel.querySelectorAll<HTMLElement>(PILL_SELECTOR).forEach((pill, pillIndex) => {
        pill.style.display = isPillVisible(pillIndex, next, settings.collapsedLimit) ? "" : "none";
      });
    },
    [settings.collapsedLimit],
  );

  const syncPanelHeight = useCallback((isMobile: boolean) => {
    const elements = findPanel();
    if (!elements) return;
    const { panel, inner } = elements;
    if (!isMobile) {
      panel.style.height = "";
      panel.style.overflow = "";
      panel.style.transition = "";
      return;
    }
    panel.style.overflow = "hidden";
    panel.style.height = `${inner.scrollHeight}px`;
    panel.style.transition = "";
  }, []);

  useEffect(() => {
    const query = window.matchMedia(mobileQuery(settings.mobileMaxWidthPx));
    const sync = () => {
      const next: SkillsFlatView = { isMobile: query.matches, isOpen: viewRef.current.isOpen };
      viewRef.current = next;
      applyPillVisibility(next);
      syncPanelHeight(next.isMobile);
      setView(next);
    };
    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
    };
  }, [settings.mobileMaxWidthPx, applyPillVisibility, syncPanelHeight]);

  const toggle = () => {
    const current = viewRef.current;
    const next: SkillsFlatView = { isMobile: current.isMobile, isOpen: !current.isOpen };
    viewRef.current = next;
    const elements = findPanel();
    const animated = elements !== null && !window.matchMedia(settings.reducedMotionQuery).matches;

    if (!elements || !animated) {
      applyPillVisibility(next);
      syncPanelHeight(next.isMobile);
      setView(next);
      return;
    }

    const { panel, inner } = elements;
    const settle = () => {
      panel.style.height = `${inner.scrollHeight}px`;
      panel.style.overflow = "hidden";
      panel.style.transition = "";
    };
    const animation = {
      settleMarginMs: settings.settleMarginMs,
      easing: settings.easing,
      innerSelector: INNER_SELECTOR,
      onDone: settle,
    };

    if (next.isOpen) {
      applyPillVisibility(next);
      panel.style.overflow = "hidden";
      panel.style.height = `${panel.offsetHeight}px`;
      animateHeight(panel, { ...animation, toHeight: `${inner.scrollHeight}px`, durationMs: settings.openMs });
    } else {
      panel.style.overflow = "hidden";
      panel.style.height = `${panel.scrollHeight}px`;
      applyPillVisibility(next);
      animateHeight(panel, { ...animation, toHeight: `${inner.scrollHeight}px`, durationMs: settings.closeMs });
    }
    setView(next);
  };

  const hiddenCount = hiddenPillCount(totalPills, view.isMobile, settings.collapsedLimit);
  const showToggle = isToggleShown(view, hiddenCount);
  const showCount = !view.isOpen && hiddenCount > 0;

  return (
    <button
      type="button"
      className="skills-flat__toggle"
      style={showToggle ? undefined : { display: "none" }}
      onClick={toggle}
      aria-expanded={view.isOpen}
    >
      <span className="skills-flat__toggle-label">{view.isOpen ? viewLessLabel : viewMoreLabel}</span>
      <span className="skills-flat__toggle-count" style={showCount ? undefined : { display: "none" }}>
        {`+${hiddenCount}`}
      </span>
      <span
        className={view.isOpen ? "skills-flat__toggle-chevron is-open" : "skills-flat__toggle-chevron"}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: chevronHtml }}
      />
    </button>
  );
}
