import { useEffect, useRef, useState } from "preact/hooks";
import { stepIndex, swapDirectionOf, type SwapDirection } from "../lib/heroCard";
import { prefersReducedMotion } from "../lib/browser/reducedMotion";

export interface HeroCardView {
  readonly caption: string;
  readonly title: string;
  /** Pre-rendered badge icon SVG. */
  readonly iconHtml: string;
  /** `--tint` / `--tint-ink` custom properties for the badge. */
  readonly tintStyle: Readonly<Record<string, string>>;
}

interface HeroCardsProps {
  readonly cards: readonly HeroCardView[];
  readonly swapMs: number;
  readonly previousLabel: string;
  readonly nextLabel: string;
  readonly previousIconHtml: string;
  readonly nextIconHtml: string;
}

const SWAP_CLASSES = [
  "is-swapping-next",
  "is-swapping-prev",
  "is-swap-instant",
  "is-entering-next",
  "is-entering-prev",
];

/** Reading layout forces the browser to flush pending style changes. */
function forceReflow(element: HTMLElement): number {
  return element.offsetWidth;
}

/**
 * Hero "Now" card carousel. Direction-aware swap: the old caption/title slides out (CSS transition), the content
 * changes while invisible, then the new content slides in from the opposite side. The swap classes are toggled
 * imperatively on stable nodes (never via render) so rapid clicks retarget the transition instead of restarting it.
 */
export default function HeroCards({
  cards,
  swapMs,
  previousLabel,
  nextLabel,
  previousIconHtml,
  nextIconHtml,
}: HeroCardsProps) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const swapRef = useRef<HTMLDivElement>(null);
  const badgeIconRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef(0);
  const exitListenerRef = useRef<((event: TransitionEvent) => void) | null>(null);

  const commit = (next: number) => {
    indexRef.current = next;
    setIndex(next);
  };

  const clearPending = () => {
    window.clearTimeout(timerRef.current);
    const wrap = swapRef.current;
    if (wrap && exitListenerRef.current) wrap.removeEventListener("transitionend", exitListenerRef.current);
    exitListenerRef.current = null;
  };

  const finishSwap = (wrap: HTMLElement, next: number, direction: SwapDirection) => {
    clearPending();
    commit(next); // content updates while fully transparent/off-axis: invisible swap
    const icon = badgeIconRef.current;
    wrap.classList.add("is-swap-instant"); // transitions off for one frame: the reposition is a silent jump
    wrap.classList.remove("is-swapping-next", "is-swapping-prev");
    wrap.classList.add(`is-entering-${direction}`);
    icon?.classList.add("is-pulsing"); // brief content-acknowledge pulse
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrap.classList.remove("is-swap-instant", `is-entering-${direction}`); // now animates back to rest
        icon?.classList.remove("is-pulsing");
      });
    });
  };

  const step = (direction: number) => {
    if (cards.length === 0) return;
    const next = stepIndex(indexRef.current, direction, cards.length);
    const wrap = swapRef.current;
    if (!wrap || prefersReducedMotion()) {
      commit(next);
      return;
    }
    const swapDirection = swapDirectionOf(direction);
    clearPending();
    // Clear anything an interrupted finishSwap left behind: is-swap-instant would disable the transition we trigger.
    wrap.classList.remove(...SWAP_CLASSES);
    forceReflow(wrap); // so a rapid re-click retargets the transition
    wrap.classList.add(`is-swapping-${swapDirection}`);
    badgeIconRef.current?.classList.remove("is-pulsing");

    const onExitEnd = (event: TransitionEvent) => {
      if (event.target !== wrap || event.propertyName !== "opacity") return;
      finishSwap(wrap, next, swapDirection);
    };
    exitListenerRef.current = onExitEnd;
    wrap.addEventListener("transitionend", onExitEnd);
    timerRef.current = window.setTimeout(() => {
      finishSwap(wrap, next, swapDirection);
    }, swapMs);
  };

  useEffect(() => {
    return clearPending;
  }, []);

  const active = cards[index];
  if (!active) return null;

  return (
    <div
      className="hero-card beam sheen"
      data-reveal="stack"
      data-delay="400"
      onClick={() => {
        step(1);
      }}
    >
      <div className="hero-card__inner">
        <div className="hero-card__badge" style={active.tintStyle}>
          <span
            ref={badgeIconRef}
            className="hero-card__badge-icon"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: active.iconHtml }}
          />
        </div>
        <div className="hero-card__body">
          <div ref={swapRef} className="hero-card__swap">
            <div className="hero-card__caption">{active.caption}</div>
            <div className="hero-card__title">{active.title}</div>
          </div>
          <div className="hero-card__footer">
            <div className="hero-card__dots">
              {cards.map((card, cardIndex) => (
                <span
                  key={card.title}
                  className={cardIndex === index ? "hero-card__dot is-active" : "hero-card__dot"}
                />
              ))}
            </div>
            <div className="hero-card__nav">
              <button
                type="button"
                className="hero-card__arrow"
                aria-label={previousLabel}
                onClick={(event) => {
                  event.stopPropagation();
                  step(-1);
                }}
              >
                <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: previousIconHtml }} />
              </button>
              <button
                type="button"
                className="hero-card__arrow"
                aria-label={nextLabel}
                onClick={(event) => {
                  event.stopPropagation();
                  step(1);
                }}
              >
                <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: nextIconHtml }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
