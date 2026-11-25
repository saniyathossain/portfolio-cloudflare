import { describe, expect, it } from "vitest";
import { INITIAL_ROLE_STATE, planRoleToggle, roleBodyId, roleIdFromPanelId } from "../../src/lib/experienceAccordion";

describe("planRoleToggle", () => {
  it("opens a closed role and asks for the body to be mounted the first time", () => {
    const step = planRoleToggle(INITIAL_ROLE_STATE);
    expect(step.direction).toBe("open");
    expect(step.next).toEqual({ isOpen: true, hasOpenedOnce: true });
    expect(step.needsBodyMount).toBe(true);
  });

  it("does not remount the body on a re-open", () => {
    const step = planRoleToggle({ isOpen: false, hasOpenedOnce: true });
    expect(step.direction).toBe("open");
    expect(step.needsBodyMount).toBe(false);
  });

  it("keeps an open role open until the close animation settles", () => {
    const current = { isOpen: true, hasOpenedOnce: true };
    const step = planRoleToggle(current);
    expect(step.direction).toBe("close");
    expect(step.next).toBe(current);
  });
});

describe("role ids", () => {
  it("extracts the role id from a panel id", () => {
    expect(roleIdFromPanelId("exp-panel-bs23-staff")).toBe("bs23-staff");
  });

  it("rejects ids that are not role panels", () => {
    expect(roleIdFromPanelId("other-panel-x")).toBeNull();
    expect(roleIdFromPanelId("exp-panel-")).toBeNull();
  });

  it("builds the body template id", () => {
    expect(roleBodyId("bs23-staff")).toBe("exp-body-bs23-staff");
  });
});
