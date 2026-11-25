/** Everything a stack pill needs to render: label, tint, icon source and a monogram fallback. */
export interface StackBrand {
  readonly label: string;
  /** Pill-shell tint (drives --brand). */
  readonly color: string;
  /** Class that sets --brand to `color` (defined in the generated brands.css). */
  readonly colorClass: string;
  /** The brand's own logo colour. */
  readonly rawColor: string;
  /** Local SVG path, or null when the stack has no icon (renders the monogram). */
  readonly iconSrc: string | null;
  readonly monogram: string;
  readonly foreground: string;
}
