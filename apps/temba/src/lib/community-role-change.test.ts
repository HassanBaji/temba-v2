import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  COMMUNITY_ROLES,
  isCommunityRole,
  roleChangeConfirmCopy,
  roleChangeNeedsConfirmation,
} from "./community-role-change";

describe("isCommunityRole", () => {
  it("accepts the three Community roles only", () => {
    for (const role of COMMUNITY_ROLES) {
      assert.equal(isCommunityRole(role), true);
    }
    assert.equal(isCommunityRole(""), false);
    assert.equal(isCommunityRole("Owner"), false);
    assert.equal(isCommunityRole("operator"), false);
  });
});

describe("roleChangeNeedsConfirmation", () => {
  it("confirms making someone else an Owner", () => {
    for (const from of ["admin", "member"] as const) {
      assert.equal(
        roleChangeNeedsConfirmation({
          name: "Ana",
          isSelf: false,
          from,
          to: "owner",
        }),
        true,
      );
    }
  });

  it("confirms any change to the viewer's own role", () => {
    for (const to of ["admin", "member"] as const) {
      assert.equal(
        roleChangeNeedsConfirmation({
          name: "Me",
          isSelf: true,
          from: "owner",
          to,
        }),
        true,
      );
    }
  });

  it("applies other role changes directly", () => {
    const direct = [
      { from: "admin", to: "member" },
      { from: "member", to: "admin" },
      { from: "owner", to: "admin" },
      { from: "owner", to: "member" },
    ] as const;
    for (const { from, to } of direct) {
      assert.equal(
        roleChangeNeedsConfirmation({ name: "Ana", isSelf: false, from, to }),
        false,
      );
    }
  });

  it("never confirms re-choosing the current role", () => {
    for (const role of COMMUNITY_ROLES) {
      for (const isSelf of [true, false]) {
        assert.equal(
          roleChangeNeedsConfirmation({
            name: "Ana",
            isSelf,
            from: role,
            to: role,
          }),
          false,
        );
      }
    }
  });
});

describe("roleChangeConfirmCopy", () => {
  it("names the member being made an Owner", () => {
    const copy = roleChangeConfirmCopy({
      name: "Ana",
      isSelf: false,
      from: "member",
      to: "owner",
    });
    assert.equal(copy.title, "Make Ana an Owner?");
    assert.equal(copy.confirmLabel, "Make Owner");
  });

  it("names the viewer's new role", () => {
    const copy = roleChangeConfirmCopy({
      name: "Me",
      isSelf: true,
      from: "owner",
      to: "admin",
    });
    assert.equal(copy.title, "Change your role to Admin?");
    assert.equal(copy.confirmLabel, "Become Admin");
  });
});
