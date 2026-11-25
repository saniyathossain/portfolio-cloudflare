import { editorialIconKey, type EditorialIconSize } from "../lib/editorial";
import { PANEL_ID } from "../lib/browser/editorialMotion";
import { fillTemplate } from "../lib/text";
import type { Article } from "../types/Portfolio";
import { classNames } from "./editorial/classNames";
import { EditorialEmpty } from "./editorial/EditorialEmpty";
import { EditorialMore } from "./editorial/EditorialMore";
import { EditorialRow } from "./editorial/EditorialRow";
import { EditorialSearch } from "./editorial/EditorialSearch";
import { EditorialTabs } from "./editorial/EditorialTabs";
import type { EditorialConfig, EditorialCopy, EditorialOutbound, FilterAnimation } from "./editorial/types";
import { useEditorial } from "./editorial/useEditorial";

interface EditorialProps {
  readonly articles: readonly Article[];
  readonly config: EditorialConfig;
  readonly copy: EditorialCopy;
  readonly outbound: EditorialOutbound;
  /** Server-rendered icon SVGs keyed by `editorialIconKey(name, size)`. */
  readonly iconMarkup: Readonly<Record<string, string>>;
}

const LIST_REVEAL_DELAY_MS = 180;

function stageAnimationClass(animation: FilterAnimation): string {
  if (animation === "exit") return "is-exiting";
  return animation === "enter" ? "is-entering" : "";
}

/** Floating platform-tab dock + search + article list with filter-change motion (replaces Alpine `editorialHelpers`). */
export default function Editorial({ articles, config, copy, outbound, iconMarkup }: EditorialProps) {
  const { dockRef, tablistRef, listRef, platformTabs, visibleArticles, search, filter } = useEditorial(
    articles,
    config,
  );
  const icon = (name: string, size: EditorialIconSize): string => iconMarkup[editorialIconKey(name, size)] ?? "";
  const trimmedQuery = search.query.trim();
  const emptyHint = trimmedQuery
    ? fillTemplate(copy.emptyHintWithQueryTemplate, { query: trimmedQuery })
    : copy.emptyHint;

  return (
    <div>
      <div ref={dockRef} className={classNames("editorial-dock", search.isSearchMode && "is-search-mode")}>
        <EditorialTabs
          tablistRef={tablistRef}
          tabs={platformTabs}
          activeKey={filter.filterKey}
          isSearchMode={search.isSearchMode}
          copy={copy}
          icon={icon}
          onSelect={filter.setFilter}
        />
        <EditorialSearch
          inputRef={search.inputRef}
          query={search.query}
          isSearchMode={search.isSearchMode}
          isFocused={search.isSearchFocused}
          copy={copy}
          icon={icon}
          onQueryInput={search.onQueryInput}
          onFocusChange={search.setIsSearchFocused}
          onOpen={search.open}
          onClose={search.close}
          onClear={search.clear}
        />
      </div>
      <div
        className={classNames(
          "editorial-stage glass-panel spec spec--panel",
          stageAnimationClass(filter.filterAnimation),
        )}
        id="editorial-stage"
      >
        <div className="editorial-panel" id={PANEL_ID}>
          <ul
            ref={listRef}
            className="editorial-list editorial-list--v0"
            hidden={visibleArticles.length === 0}
            data-reveal=""
            data-delay={LIST_REVEAL_DELAY_MS}
          >
            {visibleArticles.map((article, index) => (
              <EditorialRow key={article.id} article={article} index={index} config={config} copy={copy} icon={icon} />
            ))}
          </ul>
          <EditorialEmpty isShown={visibleArticles.length === 0} hint={emptyHint} copy={copy} icon={icon} />
          <EditorialMore outbound={outbound} copy={copy} isShown={!trimmedQuery && !search.isSearchMode} icon={icon} />
        </div>
      </div>
    </div>
  );
}
