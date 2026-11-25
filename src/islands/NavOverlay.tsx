import { useStore } from "@nanostores/preact";
import { useEffect, useState } from "preact/hooks";
import { readClock, type ClockLabels } from "../lib/clock";
import { shellStore } from "../stores/ui";
import { ShellAction } from "../enums/ShellAction";

export interface NavOverlayItem {
  readonly label: string;
  /** Pre-rendered icon SVG. */
  readonly iconHtml: string;
  readonly sectionId: string;
  /** Items flagged `action: "modal"` open the contact modal instead of scrolling. */
  readonly opensModal: boolean;
}

interface NavOverlayProps {
  readonly ariaLabel: string;
  readonly brandName: string;
  readonly closeLabel: string;
  readonly closeIconHtml: string;
  readonly items: readonly NavOverlayItem[];
  readonly localTimeLabel: string;
  readonly contactLabel: string;
  readonly clockLabels: ClockLabels;
  readonly tickMs: number;
  /** Build-time reading so the first client render matches the server markup. */
  readonly initialTimeText: string;
}

/** Full-screen navigation drawer. The item list is lazily mounted on the first open (sticky), like the legacy page. */
export default function NavOverlay(props: NavOverlayProps) {
  const { menuOpen, menuMounted } = useStore(shellStore);
  const [timeText, setTimeText] = useState(props.initialTimeText);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const update = () => {
      setTimeText(readClock(new Date(), props.clockLabels).timeText);
    };
    update();
    const timerId = window.setInterval(update, props.tickMs);
    return () => {
      window.clearInterval(timerId);
    };
  }, [menuOpen, props.clockLabels, props.tickMs]);

  return (
    <div
      className={menuOpen ? "nav-overlay is-open" : "nav-overlay"}
      role="dialog"
      aria-modal="true"
      aria-label={props.ariaLabel}
      inert={!menuOpen}
    >
      <div className="shell flex items-center justify-between pt-8 pb-6 pr-[1.8rem] sm:pr-[2.55rem]">
        <span className="text-lg font-semibold text-white">{props.brandName}</span>
        <button type="button" className="menu-btn nav-overlay__close" data-action={ShellAction.CloseMenu}>
          <span className="menu-btn__ripple" aria-hidden="true" />
          <span>
            <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: props.closeIconHtml }} />
            {props.closeLabel}
          </span>
        </button>
      </div>
      <nav className="shell flex flex-1 flex-col justify-center">
        {menuMounted && (
          <ul className="flex flex-col gap-1">
            {props.items.map((item) => (
              <li key={item.sectionId}>
                <button
                  type="button"
                  className="nav-overlay__item"
                  data-action={item.opensModal ? ShellAction.NavModal : undefined}
                  data-nav-target={item.opensModal ? undefined : item.sectionId}
                >
                  <span className="nav-overlay__gutter" aria-hidden="true" />
                  <span className="nav-overlay__icon" aria-hidden="true">
                    <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: item.iconHtml }} />
                  </span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
      <div className="shell flex flex-col gap-3 border-t border-white/10 py-6 text-xs uppercase tracking-wide text-white/45 sm:flex-row sm:justify-between">
        <span>
          {props.localTimeLabel}
          <span>{timeText}</span>
        </span>
        <button type="button" className="text-white/70 hover:text-white" data-action={ShellAction.MenuToModal}>
          {props.contactLabel}
        </button>
      </div>
    </div>
  );
}
