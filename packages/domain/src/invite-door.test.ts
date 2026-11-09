import { isolate } from "@repo/i18n/bidi";
import { describe, expect, it } from "vitest";

import {
  inviteLinkLifetimeNote,
  inviteLinkNote,
  inviteModes,
  inviteSheetTitle,
  lookupResultView,
  noPlayersMatchCopy,
  openSeatCount,
  phoneInviteLabel,
  phoneInviteNote,
  playersHeading,
  rowWithPhone,
  textMessageUrl,
} from "./invite-door";

describe("lookupResultView", () => {
  it("leads with the username, then the cue, and reads the invite", () => {
    expect(
      lookupResultView(
        {
          id: "u",
          name: "Ada",
          username: "ada",
          cue: "Group member",
          email: "a@x.io",
        },
        true,
        "en",
      ),
    ).toEqual({
      id: "u",
      name: "Ada",
      meta: "@ada, Group member",
      accessibilityLabel: "Ada, @ada, Group member, invited",
    });
    expect(
      lookupResultView({ id: "u", name: "Kim" }, false, "en"),
    ).toMatchObject({
      meta: null,
      accessibilityLabel: "Kim",
    });
  });

  it("isolates the handle and the phone in Arabic", () => {
    expect(
      lookupResultView(
        { id: "u", name: "Ada", username: "ada", phoneNumber: "+97333112233" },
        false,
        "ar",
      ).meta,
    ).toBe(`${isolate("@ada")}، ${isolate("+97333112233")}`);
  });
});

describe("inviteModes", () => {
  it("offers Phone and Link only with link rights", () => {
    expect(inviteModes({ canLookup: true, canLink: true })).toEqual([
      "players",
      "phone",
      "link",
    ]);
    expect(inviteModes({ canLookup: true, canLink: false })).toEqual([
      "players",
    ]);
    expect(inviteModes({ canLookup: false, canLink: true })).toEqual([
      "phone",
      "link",
    ]);
  });
});

describe("invite sheet copy", () => {
  it("names the sheet for its door", () => {
    expect(inviteSheetTitle("game", "en")).toBe("Invite players");
    expect(inviteSheetTitle("team", "en")).toBe("Invite your partner");
  });

  it("switches the list heading when searching", () => {
    expect(playersHeading("  ", "en")).toBe("Suggested");
    expect(playersHeading("nor", "en")).toBe("Results");
  });

  it("points to the other ways in only when they exist", () => {
    expect(noPlayersMatchCopy(" zed ", true, "en")).toBe(
      'No one on Temba matches "zed".\nTry their phone number or send them the link.',
    );
    expect(noPlayersMatchCopy("zed", false, "en")).toBe(
      'No one on Temba matches "zed".',
    );
  });

  it("asks for more than one letter before it searches", () => {
    const hint = "Type a name, or someone's full email or phone number.";
    expect(noPlayersMatchCopy("", true, "en")).toBe(hint);
    expect(noPlayersMatchCopy(" z ", false, "en")).toBe(hint);
  });

  it("labels the text invite by readiness", () => {
    expect(phoneInviteLabel(false, false, "en")).toBe("Enter a number");
    expect(phoneInviteLabel(true, false, "en")).toBe("Send invite by text");
    expect(phoneInviteLabel(true, true, "en")).toBe("Sending…");
    expect(phoneInviteNote(false, "en")).toBe(
      "They get a text with your invite.",
    );
  });

  it("describes the link for each door", () => {
    expect(inviteLinkNote("game", "en")).toContain("take a seat");
    expect(inviteLinkNote("group", "en")).toContain("join the Group");
  });

  it("gives a Game link no clock and the other doors 6 hours", () => {
    expect(inviteLinkLifetimeNote("game", "en")).toBe(
      "Works until the Game ends or registration closes.",
    );
    expect(inviteLinkLifetimeNote("group", "en")).toBe(
      "Each link works for 6 hours.",
    );
    expect(inviteLinkLifetimeNote("team", "en")).toBe(
      "Each link works for 6 hours.",
    );
  });

  it("reads in Arabic", () => {
    expect(inviteSheetTitle("game", "ar")).toBe("دعوة لاعبين");
    expect(phoneInviteLabel(true, true, "ar")).toBe("جارٍ الإرسال…");
  });
});

describe("openSeatCount", () => {
  it("counts open seats", () => {
    expect(
      openSeatCount([
        { left: { name: "Ada" }, right: null },
        { left: null, right: null },
      ]),
    ).toBe(3);
  });
});

describe("rowWithPhone", () => {
  it("matches the whole number, however it is written", () => {
    const rows = [
      { id: "a", name: "Ada", phoneNumber: "+973 3300 00001" },
      { id: "k", name: "Kim", phoneNumber: "+973 3300 0000" },
    ];
    expect(rowWithPhone(rows, "+97333000000")?.id).toBe("k");
    expect(rowWithPhone(rows, "+97339999999")).toBeNull();
  });
});

describe("textMessageUrl", () => {
  it("puts the body where each platform reads it", () => {
    expect(textMessageUrl("ios", "+97333000000", "Join me")).toBe(
      "sms:+97333000000&body=Join%20me",
    );
    expect(textMessageUrl("android", null, "Join me")).toBe(
      "sms:?body=Join%20me",
    );
  });
});
