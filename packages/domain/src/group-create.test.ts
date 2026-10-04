import { describe, expect, it } from "vitest";

import {
  GROUP_CREATE_COPY,
  groupCreateDoor,
  groupCreateRequiresApproval,
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

describe("GROUP_CREATE_COPY", () => {
  it("names the submit action per context", () => {
    expect(GROUP_CREATE_COPY.loose.submit).toBe("Create Group");
    expect(GROUP_CREATE_COPY.club.submit).toBe("Create Club Group");
  });
});
