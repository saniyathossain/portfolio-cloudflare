import { describe, expect, it } from "vitest";
import { escapeHtml, fillTemplate, highlightTerms, pluralize } from "../../src/lib/text";

describe("text helpers", () => {
  it("escapes HTML", () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  });

  it("highlights longest term first and escapes before matching", () => {
    expect(highlightTerms("Node.js and node <b>", ["node", "Node.js"])).toBe(
      '<strong class="exp-highlight">Node.js</strong> and <strong class="exp-highlight">node</strong> &lt;b&gt;',
    );
    expect(highlightTerms("plain <i>", [])).toBe("plain &lt;i&gt;");
  });

  it("fills known placeholders and keeps unknown ones", () => {
    expect(fillTemplate("{roles} roles, {missing}", { roles: 3 })).toBe("3 roles, {missing}");
  });

  it("pluralizes", () => {
    expect(pluralize(1, "year")).toBe("1 year");
    expect(pluralize(2, "year")).toBe("2 years");
  });
});
