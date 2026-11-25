import { describe, expect, it } from "vitest";
import { readContactPayload } from "../../src/lib/contactForm";
import { resolveNavTarget, scrollTargetTop, sectionIdFromHash } from "../../src/lib/navigation";

describe("resolveNavTarget", () => {
  it("opens the modal for modal-action items", () => {
    expect(resolveNavTarget({ id: "contact", action: "modal" })).toEqual({ kind: "modal" });
  });
  it("scrolls to the section otherwise", () => {
    expect(resolveNavTarget({ id: "skills" })).toEqual({ kind: "scroll", sectionId: "skills" });
  });
});

describe("scrollTargetTop", () => {
  it("converts a viewport rect top to a document offset minus the gap", () => {
    expect(scrollTargetTop(300, 1000, 12)).toBe(1288);
  });
});

describe("sectionIdFromHash", () => {
  it("strips the leading hash", () => {
    expect(sectionIdFromHash("#experience")).toBe("experience");
    expect(sectionIdFromHash("")).toBe("");
  });
});

describe("readContactPayload", () => {
  it("maps the Turnstile token field and defaults missing values to empty strings", () => {
    const data = new FormData();
    data.set("name", "Ada");
    data.set("cf-turnstile-response", "tok");
    expect(readContactPayload(data)).toEqual({ name: "Ada", email: "", project: "", token: "tok", company: "" });
  });
});
