import { describe, expect, it } from "vitest";
import { hiddenPillCount, isPillVisible, isToggleShown, mobileQuery } from "../../src/lib/skillsFlat";

describe("skillsFlat", () => {
  const collapsedMobile = { isMobile: true, isOpen: false };
  it("limits pills only when collapsed on mobile", () => {
    expect(isPillVisible(11, collapsedMobile, 12)).toBe(true);
    expect(isPillVisible(12, collapsedMobile, 12)).toBe(false);
    expect(isPillVisible(40, { isMobile: true, isOpen: true }, 12)).toBe(true);
    expect(isPillVisible(40, { isMobile: false, isOpen: false }, 12)).toBe(true);
  });
  it("counts hidden pills on mobile only", () => {
    expect(hiddenPillCount(50, true, 12)).toBe(38);
    expect(hiddenPillCount(5, true, 12)).toBe(0);
    expect(hiddenPillCount(50, false, 12)).toBe(0);
  });
  it("shows the toggle on mobile when hidden pills exist or while open", () => {
    expect(isToggleShown(collapsedMobile, 3)).toBe(true);
    expect(isToggleShown(collapsedMobile, 0)).toBe(false);
    expect(isToggleShown({ isMobile: true, isOpen: true }, 0)).toBe(true);
    expect(isToggleShown({ isMobile: false, isOpen: true }, 9)).toBe(false);
  });
  it("builds the media query", () => {
    expect(mobileQuery(639)).toBe("(max-width: 639px)");
  });
});
