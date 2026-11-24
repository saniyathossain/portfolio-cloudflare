import type { RefObject } from "preact";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  bindRowTilt,
  bindTabCountReveal,
  bindTabLens,
  cascadeTitles,
  PANEL_ID,
  prefersReducedMotion,
  reflowEditorialPanel,
  syncTabLens,
} from "../../lib/browser/editorialMotion";
import { activeArticles, buildPlatformTabs, filterArticles } from "../../lib/editorial";
import type { Article } from "../../types/Portfolio";
import type { EditorialConfig, FilterAnimation } from "./types";

const LIST_GENERATION_CLASS = "editorial-list--v";
const LIST_LIVE_CLASS = "editorial-list--live";

/** Freshest state, read by handlers/timers that outlive the render that created them. */
interface LatestState {
  filterKey: string;
  isSearchMode: boolean;
  query: string;
}

interface SharedContext {
  readonly config: EditorialConfig;
  readonly latest: { current: LatestState };
  readonly syncLens: (hoverIndex?: number) => void;
  readonly reflowPanel: (onSettled?: () => void) => void;
}

function useFilterSwap(
  { config, latest, syncLens, reflowPanel }: SharedContext,
  listRef: RefObject<HTMLUListElement | null>,
  isListLive: boolean,
) {
  const [filterKey, setFilterKey] = useState(config.tabs[0]?.key ?? "");
  const [filterAnimation, setFilterAnimation] = useState<FilterAnimation>("");
  const [listGeneration, setListGeneration] = useState(0);
  const exitTimer = useRef(0);
  const enterTimer = useRef(0);
  const isSwapPending = useRef(false);
  latest.current.filterKey = filterKey;

  const settleEnter = (delayMs: number): void => {
    window.clearTimeout(enterTimer.current);
    enterTimer.current = window.setTimeout(() => {
      setFilterAnimation("");
    }, delayMs);
  };

  // Generation / live modifiers go through classList (not the className prop) so classes other scripts add to
  // the list (the scroll-reveal `is-visible`) survive re-renders.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    for (const className of [...list.classList]) {
      if (className.startsWith(LIST_GENERATION_CLASS)) list.classList.remove(className);
    }
    list.classList.add(`${LIST_GENERATION_CLASS}${listGeneration}`);
    list.classList.toggle(LIST_LIVE_CLASS, isListLive);
  }, [listGeneration, isListLive]);

  // After a filter swap is committed to the DOM: re-seat the lens, cascade the new titles, reflow the panel.
  useLayoutEffect(() => {
    if (!isSwapPending.current) return;
    isSwapPending.current = false;
    syncLens();
    const panel = document.getElementById(PANEL_ID);
    cascadeTitles(panel);
    if (!panel || prefersReducedMotion(config)) {
      settleEnter(config.motionMs.reducedEnter);
      return;
    }
    reflowPanel(() => {
      settleEnter(config.motionMs.enter);
    });
  }, [listGeneration]);

  useEffect(
    () => () => {
      window.clearTimeout(exitTimer.current);
      window.clearTimeout(enterTimer.current);
    },
    [],
  );

  const setFilter = (key: string): void => {
    if (key === latest.current.filterKey) return;
    const swap = (): void => {
      isSwapPending.current = true;
      setFilterKey(key);
      setListGeneration((generation) => generation + 1);
      setFilterAnimation("enter");
    };
    if (prefersReducedMotion(config) || !document.getElementById(PANEL_ID)) {
      swap();
      return;
    }
    window.clearTimeout(exitTimer.current);
    setFilterAnimation("exit");
    exitTimer.current = window.setTimeout(swap, config.motionMs.exit);
  };

  return { filterKey, filterAnimation, setFilter };
}

function useSearch(
  { config, latest, syncLens, reflowPanel }: SharedContext,
  dockRef: RefObject<HTMLDivElement | null>,
) {
  const [query, setQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dockUnlockTimer = useRef(0);
  const searchFrame = useRef(0);
  latest.current.isSearchMode = isSearchMode;
  latest.current.query = query;

  useLayoutEffect(() => {
    if (isSearchMode) inputRef.current?.focus();
  }, [isSearchMode]);

  useEffect(
    () => () => {
      window.clearTimeout(dockUnlockTimer.current);
      cancelAnimationFrame(searchFrame.current);
    },
    [],
  );

  // The input is uncontrolled (so the server markup carries no `value` attribute); clearing is explicit.
  const resetInput = (): void => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const onQueryInput = (nextQuery: string): void => {
    setQuery(nextQuery);
    cancelAnimationFrame(searchFrame.current);
    searchFrame.current = requestAnimationFrame(() => {
      reflowPanel();
      cascadeTitles(document.getElementById(PANEL_ID));
    });
  };

  const open = (): void => {
    if (latest.current.isSearchMode) return;
    const dock = dockRef.current;
    if (dock) dock.style.minHeight = `${dock.offsetHeight}px`; // hold the dock's height while its contents swap
    setIsSearchMode(true);
  };

  const close = (): void => {
    if (!latest.current.isSearchMode) return;
    const hadQuery = latest.current.query.trim().length > 0;
    setIsSearchFocused(false);
    setQuery("");
    setIsSearchMode(false);
    resetInput();
    inputRef.current?.blur();
    window.clearTimeout(dockUnlockTimer.current);
    dockUnlockTimer.current = window.setTimeout(() => {
      if (dockRef.current) dockRef.current.style.minHeight = "";
    }, config.motionMs.dockUnlock);
    requestAnimationFrame(() => {
      syncLens();
      if (hadQuery) reflowPanel();
    });
  };

  const clear = (): void => {
    if (!latest.current.query.trim()) return;
    setQuery("");
    resetInput();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      reflowPanel();
    });
  };

  return { query, isSearchMode, isSearchFocused, setIsSearchFocused, inputRef, onQueryInput, open, close, clear };
}

/** All Editorial behaviour: filter + search state, the dock lens, count tickers, row tilt and title cascade. */
export function useEditorial(articles: readonly Article[], config: EditorialConfig) {
  const active = useMemo(() => activeArticles(articles), [articles]);
  const platformTabs = useMemo(() => buildPlatformTabs(active, config.tabs), [active, config.tabs]);
  const dockRef = useRef<HTMLDivElement>(null);
  const tablistRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const latest = useRef<LatestState>({ filterKey: "", isSearchMode: false, query: "" });

  const syncLens = (hoverIndex?: number): void => {
    const tabs = tablistRef.current;
    if (tabs) syncTabLens(config, tabs, latest.current.isSearchMode, hoverIndex);
  };
  const reflowPanel = (onSettled?: () => void): void => {
    reflowEditorialPanel(config, onSettled);
  };
  const shared: SharedContext = { config, latest, syncLens, reflowPanel };

  // Both hooks need `isListLive` / the other's state only through `latest`, so order is: search, then filter.
  const search = useSearch(shared, dockRef);
  const isListLive = search.isSearchMode && search.query.trim().length > 0;
  const filter = useFilterSwap(shared, listRef, isListLive);

  const visibleArticles = useMemo(
    () => filterArticles(active, config.tabs, filter.filterKey, search.query),
    [active, config.tabs, filter.filterKey, search.query],
  );

  useEffect(() => {
    const dock = dockRef.current;
    const tabs = tablistRef.current;
    if (!dock || !tabs) return;
    // syncTabLens reads layout before it writes, so it gets its own frame, away from the title cascade's DOM writes.
    const lensFrame = requestAnimationFrame(() => {
      syncLens();
    });
    const unbindLens = bindTabLens(tabs, syncLens);
    bindRowTilt(config);
    cascadeTitles(document.getElementById(PANEL_ID));
    const unbindCounts = bindTabCountReveal(
      config,
      dock,
      platformTabs.map((tab) => tab.count),
    );
    return () => {
      cancelAnimationFrame(lensFrame);
      unbindLens();
      unbindCounts();
    };
  }, []);

  return { dockRef, tablistRef, listRef, platformTabs, visibleArticles, search, filter };
}
