/** How a platform tab decides whether an article belongs to it (compared against the lower-cased platform name). */
export enum EditorialMatchMode {
  All = "all",
  Includes = "includes",
  Equals = "equals",
}
