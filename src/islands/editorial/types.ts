import type { EditorialConfig } from "../../lib/browser/editorialMotion";
import type { EditorialIconSize } from "../../lib/editorial";
import type { Portfolio } from "../../types/Portfolio";

export type EditorialCopy = Portfolio["copy"]["editorial"];
export type EditorialOutbound = Portfolio["editorialOutbound"];
export type { EditorialConfig };

export type FilterAnimation = "" | "enter" | "exit";

/** Resolves the server-rendered SVG markup for an icon at a size. */
export type IconResolver = (name: string, size: EditorialIconSize) => string;
