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
  it("picks the procedure for the type", () => {
    expect(groupCreateDoor("public")).toBe("createLoosePublic");
    expect(groupCreateDoor("private")).toBe("createLoosePrivate");
  });
});

describe("groupCreateCopy", () => {
  it("names the submit action", () => {
    expect(groupCreateCopy("en").submit).toBe("Create Group");
  });
});

describe("groupCreateSubmitLabel", () => {
  it("names the Group once it has a name", () => {
    expect(groupCreateSubmitLabel("", "en")).toBe("Create Group");
    expect(groupCreateSubmitLabel("  ", "en")).toBe("Create Group");
    expect(groupCreateSubmitLabel(" Tuesday Padel Crew ", "en")).toBe(
      "Create Tuesday Padel Crew",
    );
  });

  it("reads in Arabic", () => {
    expect(groupCreateSubmitLabel("", "ar")).toBe("إنشاء مجموعة");
    expect(groupCreateSubmitLabel("رفاق الثلاثاء", "ar")).toBe(
      "إنشاء رفاق الثلاثاء",
    );
  });
});
