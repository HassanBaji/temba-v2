import { describe, expect, it } from "vitest";

import { groupInviteOpenGraphMetadata } from "./group-invite-open-graph";

describe("groupInviteOpenGraphMetadata", () => {
  it("uses the Group name as title and the invitation line as description", () => {
    expect(
      groupInviteOpenGraphMetadata({
        groupName: "Friday Night",
        sport: "padel",
        locale: "en",
      }),
    ).toEqual({
      title: "Friday Night",
      description: 'You are invited to join "Friday Night" for "Padel"',
    });
  });

  it("falls back to Group when the name is missing", () => {
    expect(
      groupInviteOpenGraphMetadata({
        groupName: "  ",
        sport: null,
        locale: "en",
      }),
    ).toEqual({
      title: "Group",
      description: 'You are invited to join "Group"',
    });
  });

  it("reads in Arabic", () => {
    expect(
      groupInviteOpenGraphMetadata({
        groupName: "  ",
        sport: null,
        locale: "ar",
      }),
    ).toEqual({
      title: "المجموعة",
      description: "أنت مدعو للانضمام إلى «المجموعة»",
    });
  });
});
