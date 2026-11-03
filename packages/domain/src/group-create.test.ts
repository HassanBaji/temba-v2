import { describe, expect, it } from "vitest";

import {
  groupCreateCopy,
  groupCreateDoor,
  groupCreateRequiresApproval,
  groupCreateSubmitLabel,
} from "./group-create";

describe("groupCreateRequiresApproval", () => {
  it("applies only to a Public Group", () => {
    expect(groupCreateRequiresApproval("public", true)).toBe(true);
    expect(groupCreateRequiresApproval("public", false)).toBe(false);
    expect(groupCreateRequiresApproval("private", true)).toBe(false);
  });
});

describe("groupCreateDoor", () => {
  it("picks the procedure for the context and type", () => {
    expect(groupCreateDoor("loose", "public")).toBe("createLoosePublic");
    expect(groupCreateDoor("loose", "private")).toBe("createLoosePrivate");
    expect(groupCreateDoor("club", "public")).toBe("createClubPublic");
    expect(groupCreateDoor("club", "private")).toBe("createClubPrivate");
  });
});

describe("groupCreateCopy", () => {
  it("names the submit action per context", () => {
    expect(groupCreateCopy("loose", "en").submit).toBe("Create Group");
    expect(groupCreateCopy("club", "en").submit).toBe("Create Club Group");
  });
});

describe("groupCreateSubmitLabel", () => {
  it("names the Group once it has a name", () => {
    expect(groupCreateSubmitLabel("loose", "", "en")).toBe("Create Group");
    expect(groupCreateSubmitLabel("club", "  ", "en")).toBe(
      "Create Club Group",
    );
    expect(groupCreateSubmitLabel("loose", " Tuesday Padel Crew ", "en")).toBe(
      "Create Tuesday Padel Crew",
    );
  });

  it("reads in Arabic", () => {
    expect(groupCreateSubmitLabel("loose", "", "ar")).toBe("إنشاء مجموعة");
    expect(groupCreateSubmitLabel("club", "رفاق الثلاثاء", "ar")).toBe(
      "إنشاء رفاق الثلاثاء",
    );
  });
});
