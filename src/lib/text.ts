export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escape first, then wrap matches, so the output is safe to inject as HTML whatever the source text holds.
 * Longest term first so "Node.js" is matched whole before a shorter prefix could claim part of it.
 */
export function highlightTerms(text: string, terms: readonly string[]): string {
  const escapedText = escapeHtml(text);
  if (terms.length === 0) return escapedText;
  const alternatives = [...terms]
    .sort((first, second) => second.length - first.length)
    .map(escapeRegExp)
    .join("|");
  return escapedText.replace(new RegExp(`(${alternatives})`, "gi"), '<strong class="exp-highlight">$1</strong>');
}

/** Replace `{placeholder}` tokens; unknown tokens are left untouched. */
export function fillTemplate(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (token, key: string) => {
    const value = values[key];
    return value === undefined ? token : String(value);
  });
}

export function pluralize(count: number, singular: string): string {
  return `${String(count)} ${singular}${count === 1 ? "" : "s"}`;
}
