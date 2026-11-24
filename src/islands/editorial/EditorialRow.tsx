import { articleDateLabel, articleExcerpt, platformIconName, rowTint } from "../../lib/editorial";
import { fillTemplate } from "../../lib/text";
import type { Article } from "../../types/Portfolio";
import { IconSlot } from "./IconSlot";
import type { EditorialConfig, EditorialCopy, IconResolver } from "./types";

/** The `data-delay` stagger step (ms) between rows revealing on scroll. */
const ROW_REVEAL_STEP_MS = 50;

interface EditorialRowProps {
  readonly article: Article;
  readonly index: number;
  readonly config: EditorialConfig;
  readonly copy: EditorialCopy;
  readonly icon: IconResolver;
}

function ReadTime({ minutes, template }: { readonly minutes: number | null; readonly template: string }) {
  if (!minutes) return null;
  return (
    <span>
      <span className="editorial-row__sep" aria-hidden="true">
        ·
      </span>
      <span>{fillTemplate(template, { minutes })}</span>
    </span>
  );
}

/** One article link; keyed by article id so a surviving row keeps its split title and reveal state across filters. */
export function EditorialRow({ article, index, config, copy, icon }: EditorialRowProps) {
  const platformIcon = platformIconName(article.platform, config.tabs, config.fallbackPlatformIcon);
  return (
    <li
      className="editorial-row"
      style={{ "--row-i": index }}
      data-ci={rowTint(index, config.rowTints)}
      data-reveal=""
      data-delay={index * ROW_REVEAL_STEP_MS}
    >
      <a className="editorial-row__link spec" href={article.href} target="_blank" rel="noopener noreferrer">
        <span className="editorial-row__icon" aria-hidden="true">
          <IconSlot markup={icon(platformIcon, "md")} />
        </span>
        <div className="editorial-row__body">
          <p className="editorial-row__meta">
            <span className="editorial-row__platform">{article.platform}</span>
            <span className="editorial-row__sep" aria-hidden="true">
              ·
            </span>
            <time className="editorial-row__date" dateTime={article.date}>
              {articleDateLabel(article.date, config.dateLocale, config.dateTimeSuffix)}
            </time>
            <ReadTime minutes={article.readMin} template={copy.readTimeTemplate} />
          </p>
          <h3 className="editorial-row__title">{article.title}</h3>
          <p className="editorial-row__excerpt">{articleExcerpt(article.excerpt, config.fallbackExcerpt)}</p>
        </div>
        <span className="editorial-row__arrow" aria-hidden="true">
          <span className="icon-chip icon-chip--sm">
            <IconSlot markup={icon("arrow", "sm")} />
          </span>
        </span>
      </a>
    </li>
  );
}
