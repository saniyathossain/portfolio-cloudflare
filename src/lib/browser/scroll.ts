/** Same-page hash bookkeeping the legacy app did in `setHash` (home has no hash). */
export function setLocationHash(sectionId: string, options: { readonly replace?: boolean } = {}): void {
  const hash = sectionId && sectionId !== "home" ? `#${sectionId}` : "";
  const url = `${location.pathname}${location.search}${hash}`;
  if (options.replace) history.replaceState(null, "", url);
  else history.pushState(null, "", url);
}

export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: "smooth" });
  setLocationHash("home", { replace: true });
}
