import { brandColorRules } from "../lib/brandPalette";
import { brandResolver, portfolio } from "./container";

/** The generated brand stylesheets: every pill tint, and the hero partner colours alone for the critical (inlined) CSS. */
export function buildBrandCss(): { readonly all: string; readonly critical: string } {
  const partnerColors = portfolio.partners.map((partner) => partner.color);
  return {
    all: brandColorRules([...brandResolver.allTints(), ...partnerColors]),
    critical: brandColorRules(partnerColors),
  };
}
