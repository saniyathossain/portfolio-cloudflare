import { IconSlot } from "./IconSlot";
import type { EditorialCopy, EditorialOutbound, IconResolver } from "./types";

interface EditorialMoreProps {
  readonly outbound: EditorialOutbound;
  readonly copy: EditorialCopy;
  readonly isShown: boolean;
  readonly icon: IconResolver;
}

/** "More writing" strip linking to the full archives; hidden while searching. */
export function EditorialMore({ outbound, copy, isShown, icon }: EditorialMoreProps) {
  return (
    <aside className="editorial-more" aria-label={copy.moreAriaLabel} hidden={!isShown}>
      <div className="editorial-more__copy">
        <p className="editorial-more__eyebrow">{outbound.eyebrow}</p>
        <p className="editorial-more__hint">{outbound.hint}</p>
      </div>
      <div className="editorial-more__links">
        {outbound.links.map((link) => (
          <a
            key={link.href}
            className="editorial-more__link"
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            data-ci={link.ci}
          >
            <span className="editorial-more__link-icon" aria-hidden="true">
              <IconSlot markup={icon(link.icon, "sm")} />
            </span>
            <span className="editorial-more__link-label">{link.label}</span>
            <span className="editorial-more__link-arrow" aria-hidden="true">
              <IconSlot markup={icon("arrow", "sm")} />
            </span>
          </a>
        ))}
      </div>
    </aside>
  );
}
