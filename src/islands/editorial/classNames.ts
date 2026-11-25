/** Joins the truthy class names, in order. */
export function classNames(...names: readonly (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
