import { describe, expect, it } from "vitest";

import { groupInviteClipboardText } from "~/lib/group-invite-share-message";

const inviteUrl = "https://app.example/gr/A3F8K2PQ";

describe("groupInviteClipboardText", () => {
  it("writes an invitation with the Group name, sport label, and join URL", () => {
    expect(
      groupInviteClipboardText({
        groupName: "Friday Night",
        sport: "padel",
        inviteUrl,
      }),
    ).toBe(
      `You are invited to join "Friday Night" for "Padel"\nJoin: ${inviteUrl}`,
    );
  });

  it("uses the Football sport label", () => {
    expect(
      groupInviteClipboardText({
        groupName: "Sunday Kickabout",
        sport: "football",
        inviteUrl,
      }),
    ).toBe(
      `You are invited to join "Sunday Kickabout" for "Football"\nJoin: ${inviteUrl}`,
    );
  });

  it("falls back to Group when the name is missing", () => {
    expect(
      groupInviteClipboardText({
        groupName: "  ",
        sport: "padel",
        inviteUrl,
      }),
    ).toBe(`You are invited to join "Group" for "Padel"\nJoin: ${inviteUrl}`);
  });

  it("omits the sport clause when the Group has no sport", () => {
    expect(
      groupInviteClipboardText({
        groupName: "Friday Night",
        sport: null,
        inviteUrl,
      }),
    ).toBe(`You are invited to join "Friday Night"\nJoin: ${inviteUrl}`);
  });
});
