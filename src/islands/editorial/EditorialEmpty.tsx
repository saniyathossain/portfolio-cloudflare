import { hiddenUnless } from "./hiddenStyle";
import { IconSlot } from "./IconSlot";
import type { EditorialCopy, IconResolver } from "./types";

interface EditorialEmptyProps {
  readonly isShown: boolean;
  readonly hint: string;
  readonly copy: EditorialCopy;
  readonly icon: IconResolver;
}

export function EditorialEmpty({ isShown, hint, copy, icon }: EditorialEmptyProps) {
  return (
    <div className="editorial-empty" style={hiddenUnless(isShown)} role="status">
      <span className="editorial-empty__icon" aria-hidden="true">
        <IconSlot markup={icon("search", "md")} />
      </span>
      <p className="editorial-empty__title">{copy.emptyTitle}</p>
      <p className="editorial-empty__hint">{hint}</p>
    </div>
  );
}
