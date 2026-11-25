import type { RefObject } from "preact";
import type { PlatformTab } from "../../lib/editorial";
import { fillTemplate } from "../../lib/text";
import { classNames } from "./classNames";
import { IconSlot } from "./IconSlot";
import type { EditorialCopy, IconResolver } from "./types";

interface EditorialTabsProps {
  readonly tablistRef: RefObject<HTMLDivElement | null>;
  readonly tabs: readonly PlatformTab[];
  readonly activeKey: string;
  readonly isSearchMode: boolean;
  readonly copy: EditorialCopy;
  readonly icon: IconResolver;
  readonly onSelect: (key: string) => void;
}

/** The platform filter pills with the glass lens span (positioned by `syncTabLens`). */
export function EditorialTabs({ tablistRef, tabs, activeKey, isSearchMode, copy, icon, onSelect }: EditorialTabsProps) {
  return (
    <div
      ref={tablistRef}
      className="editorial-tabs"
      role="tablist"
      aria-label={copy.tablistLabel}
      aria-hidden={isSearchMode ? "true" : "false"}
    >
      <span className="editorial-tabs__lens" aria-hidden="true" />
      {tabs.map((tab) => {
        const isActive = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            className={classNames(
              "editorial-tabs__btn",
              isActive && "is-active",
              tab.icon && "editorial-tabs__btn--icon",
            )}
            aria-selected={isActive ? "true" : "false"}
            aria-label={fillTemplate(copy.tabAriaTemplate, { label: tab.label, count: tab.count })}
            data-ci={tab.ci}
            tabIndex={isSearchMode ? -1 : 0}
            onClick={() => {
              onSelect(tab.key);
            }}
          >
            <span className="editorial-tabs__ripple" aria-hidden="true" />
            {tab.icon && (
              <span className="editorial-tabs__icon" aria-hidden="true">
                <IconSlot markup={icon(tab.icon, "sm")} />
              </span>
            )}
            <span className="editorial-tabs__label">{tab.label}</span>
            <span className="editorial-tabs__count">{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}
