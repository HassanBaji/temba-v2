import { createGroupFixtures } from "@repo/domain/group-fixtures";
import { describe, expect, it } from "vitest";

import {
  groupEditInitialFields,
  groupEditPath,
  groupEditSaveFooter,
  groupEditSubtitle,
} from "./group-edit-model";

const fixtures = createGroupFixtures(new Date("2026-03-10T12:00:00Z"));

describe("groupEditInitialFields", () => {
  it("reads the Group as loaded", () => {
    const data = fixtures.administration.requiresApproval;
    expect(groupEditInitialFields(data)).toEqual({
      name: data.name,
      sport: "padel",
      visibility: "public",
      requiresApproval: true,
    });
  });

  it("treats a Group with no stored type as Public and no sport as unset", () => {
    expect(
      groupEditInitialFields({
        ...fixtures.administration.creator,
        type: null,
        sport: null,
      }),
    ).toMatchObject({ visibility: "public", sport: null });
  });
});

describe("edit screen chrome", () => {
  it("routes by Group id", () => {
    expect(groupEditPath("g1")).toEqual({
      pathname: "/groups/edit",
      params: { groupId: "g1" },
    });
  });

  it("states the Group in the subtitle", () => {
    expect(groupEditSubtitle(fixtures.administration.creator)).toMatch(
      /^Bromma Tuesday, Padel, \d+ members$/,
    );
  });

  it("states under Save whether anything changed", () => {
    expect(groupEditSaveFooter(false)).toBe("Nothing changed yet.");
    expect(groupEditSaveFooter(true)).toBe("Unsaved changes.");
  });
});
