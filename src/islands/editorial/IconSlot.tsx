/** Pre-rendered SVG markup inside a decorative wrapper (the same shape `x-html="iconSvg(...)"` produced). */
export function IconSlot({ markup }: { readonly markup: string }) {
  return <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: markup }} />;
}
