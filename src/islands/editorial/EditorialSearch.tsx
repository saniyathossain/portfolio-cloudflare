import type { RefObject } from "preact";
import { classNames } from "./classNames";
import { IconSlot } from "./IconSlot";
import type { EditorialCopy, IconResolver } from "./types";

interface EditorialSearchProps {
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly query: string;
  readonly isSearchMode: boolean;
  readonly isFocused: boolean;
  readonly copy: EditorialCopy;
  readonly icon: IconResolver;
  readonly onQueryInput: (query: string) => void;
  readonly onFocusChange: (isFocused: boolean) => void;
  readonly onOpen: () => void;
  readonly onClose: () => void;
  readonly onClear: () => void;
}

/** Search field plus the two orbs (open / close) that morph the dock between tabs and search. */
export function EditorialSearch(props: EditorialSearchProps) {
  const { inputRef, query, isSearchMode, isFocused, copy, icon } = props;
  return (
    <div className={classNames("editorial-search", isFocused && "is-focused", query.length > 0 && "has-value")}>
      <label className="editorial-search__field">
        <span className="editorial-search__field-icon" aria-hidden="true">
          <IconSlot markup={icon("search", "sm")} />
        </span>
        <input
          ref={inputRef}
          type="search"
          className="editorial-search__input"
          onInput={(event) => {
            props.onQueryInput(event.currentTarget.value);
          }}
          onFocus={() => {
            props.onFocusChange(true);
          }}
          onBlur={() => {
            props.onFocusChange(false);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            props.onClose();
          }}
          placeholder={copy.searchPlaceholder}
          autoComplete="off"
          spellcheck={false}
          enterkeyhint="search"
          aria-label={copy.searchLabel}
        />
        <button
          type="button"
          className="editorial-search__clear"
          hidden={!(isSearchMode && query.length > 0)}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={props.onClear}
          aria-label={copy.clearSearchLabel}
        >
          <IconSlot markup={icon("close", "sm")} />
        </button>
      </label>
      <button
        type="button"
        className="editorial-search__orb editorial-search__orb--search"
        onClick={props.onOpen}
        aria-label={copy.searchLabel}
      >
        <span className="editorial-search__orb-ripple" aria-hidden="true" />
        <IconSlot markup={icon("search", "sm")} />
      </button>
      <button
        type="button"
        className="editorial-search__orb editorial-search__orb--close"
        onClick={props.onClose}
        tabIndex={isSearchMode ? 0 : -1}
        aria-hidden={isSearchMode ? "false" : "true"}
        aria-label={copy.closeSearchLabel}
      >
        <span className="editorial-search__orb-ripple" aria-hidden="true" />
        <IconSlot markup={icon("close", "sm")} />
      </button>
    </div>
  );
}
