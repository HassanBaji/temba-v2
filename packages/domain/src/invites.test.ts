import { describe, expect, it } from "vitest";

import {
  gameInviteAccess,
  gameInviteLinkStage,
  gameInviteSeatCopy,
  gameInviteSeatState,
  groupLookupNote,
  inviteLinkAcceptToast,
  levelRangeGateAction,
  inviteRowMeta,
  lookupInviteAcceptToast,
  lookupInviteSentToast,
  mergeInviteInbox,
  parseInviteLink,
} from "./invites";

const inviter = { name: "Sam Chen", image: null };

describe("inviteRowMeta", () => {
  it("names the host kind and the inviter", () => {
    expect(inviteRowMeta("team", "Sam Chen", "en")).toBe(
      "Team invite from Sam Chen",
    );
    expect(inviteRowMeta("game", null, "en")).toBe("Game invite from Someone");
  });

  it("reads in Arabic", () => {
    expect(inviteRowMeta("team", "Sam Chen", "ar")).toBe(
      "دعوة إلى فريق من Sam Chen",
    );
  });
});

describe("mergeInviteInbox", () => {
  it("merges all three hosts, newest first", () => {
    const items = mergeInviteInbox(
      {
        group: [
          {
            id: "g1",
            createdAt: new Date("2026-09-03T10:00:00Z"),
            invitedBy: { name: null, image: null },
            groupName: null,
          },
        ],
        team: [
          {
            id: "t1",
            createdAt: "2026-09-02T10:00:00Z",
            invitedBy: inviter,
            displayName: "Sam & you",
          },
        ],
        game: [
          {
            id: "x1",
            createdAt: new Date("2026-09-04T10:00:00Z"),
            invitedBy: inviter,
            gameName: "Tuesday",
            game: {
              name: "Tuesday",
              hasCustomName: true,
              format: "friendly_game",
              windowStart: null,
              windowEnd: null,
            },
            needsSeatPick: false,
            registrationStatus: "open",
            sides: [],
            vacantSeats: [],
          },
        ],
      },
      "en",
    );
    expect(items.map((item) => item.key)).toEqual([
      "game-x1",
      "group-g1",
      "team-t1",
    ]);
    expect(items[1]).toMatchObject({
      title: "Untitled Group",
      inviterName: "Someone",
      meta: "Group invite from Someone",
    });
    expect(items[0]?.seatPick).toBeNull();
  });

  it("carries the seat state for a Game that needs a seat pick", () => {
    const [item] = mergeInviteInbox(
      {
        game: [
          {
            id: "x1",
            createdAt: new Date(),
            invitedBy: inviter,
            gameName: "Tuesday",
            game: {
              name: "Tuesday",
              hasCustomName: true,
              format: "friendly_game",
              windowStart: null,
              windowEnd: null,
            },
            needsSeatPick: true,
            registrationStatus: "full",
            sides: [{ sideIndex: 1, left: { name: "Ada" }, right: null }],
            vacantSeats: [{ sideIndex: 1, position: "right" }],
          },
        ],
      },
      "en",
    );
    expect(item?.seatPick).toMatchObject({
      joinFrozen: false,
      waitlistOnly: true,
    });
  });
});

describe("gameInviteSeatState", () => {
  it("freezes a closed or cancelled Game", () => {
    for (const registrationStatus of ["closed", "cancelled"]) {
      expect(
        gameInviteSeatState({ registrationStatus, vacantSeatCount: 2 }),
      ).toEqual({ joinFrozen: true, waitlistOnly: false });
    }
  });

  it("is waitlist only when full or without a vacant seat", () => {
    expect(
      gameInviteSeatState({ registrationStatus: "full", vacantSeatCount: 1 })
        .waitlistOnly,
    ).toBe(true);
    expect(
      gameInviteSeatState({ registrationStatus: "open", vacantSeatCount: 0 })
        .waitlistOnly,
    ).toBe(true);
    expect(
      gameInviteSeatState({ registrationStatus: "open", vacantSeatCount: 1 }),
    ).toEqual({ joinFrozen: false, waitlistOnly: false });
  });
});

describe("gameInviteSeatCopy", () => {
  const open = { joinFrozen: false, waitlistOnly: false };
  const waitlist = { joinFrozen: false, waitlistOnly: true };
  const frozen = { joinFrozen: true, waitlistOnly: false };

  it("asks for a vacant Position when one is open", () => {
    expect(gameInviteSeatCopy(open, "inbox", "en")).toContain("Pick a vacant");
  });

  it("tells a full Game's invitee about the waitlist on a link only", () => {
    expect(gameInviteSeatCopy(waitlist, "link", "en")).toContain("waitlist");
    expect(gameInviteSeatCopy(waitlist, "inbox", "en")).not.toContain(
      "waitlist",
    );
  });

  it("explains a frozen Game and a signed-out visitor", () => {
    expect(gameInviteSeatCopy(frozen, "link", "en")).toContain("not open");
    expect(gameInviteSeatCopy(open, "link-signed-out", "en")).toContain(
      "Sign in",
    );
  });
});

describe("toasts", () => {
  it("reads the accepted host", () => {
    expect(lookupInviteAcceptToast("group", "en")).toBe("Joined Group");
    expect(lookupInviteAcceptToast("game", "en", { waitlisted: true })).toBe(
      "Joined waitlist",
    );
    expect(lookupInviteAcceptToast("game", "en", { waitlisted: false })).toBe(
      "Joined Game",
    );
  });

  it("reads the Invite link outcome", () => {
    expect(inviteLinkAcceptToast("group", "en")).toBe("Joined Group");
    expect(inviteLinkAcceptToast("game", "en", "already")).toBe(
      "Already on this Game",
    );
    expect(inviteLinkAcceptToast("game", "en", "waiting_for_partner")).toBe(
      "Waiting for your Team partner to accept",
    );
    expect(inviteLinkAcceptToast("game", "en", "waitlisted")).toBe(
      "Joined waitlist",
    );
    expect(inviteLinkAcceptToast("game", "en", "registered", true)).toBe(
      "Joined Game and its Group",
    );
    expect(inviteLinkAcceptToast("game", "en", "waitlisted", true)).toBe(
      "Joined waitlist and the Group",
    );
  });

  it("counts sent Lookup invites", () => {
    expect(lookupInviteSentToast(1, "en")).toBe("Lookup invite sent");
    expect(lookupInviteSentToast(3, "en")).toBe("3 Lookup invites sent");
  });
});

describe("gameInviteAccess", () => {
  const base = {
    friendlyChrome: true,
    isOrganizer: true,
    registrationStatus: "open",
    cancelledAt: null,
    registrationMode: "individual",
    partnerRequired: false,
  };

  it("lets a Friendly game Organizer invite while open or full", () => {
    expect(gameInviteAccess(base)).toEqual({
      canManage: true,
      canSendLookup: true,
    });
    expect(
      gameInviteAccess({ ...base, registrationStatus: "closed" }).canManage,
    ).toBe(false);
  });

  it("closes the doors on a cancelled tournament", () => {
    const tournament = { ...base, friendlyChrome: false };
    expect(gameInviteAccess(tournament).canManage).toBe(true);
    expect(
      gameInviteAccess({ ...tournament, cancelledAt: new Date() }).canManage,
    ).toBe(false);
  });

  it("keeps the link but drops Lookup invites for Team-only and partner-only", () => {
    expect(
      gameInviteAccess({ ...base, registrationMode: "team_only" }),
    ).toEqual({ canManage: true, canSendLookup: false });
    expect(gameInviteAccess({ ...base, partnerRequired: true })).toEqual({
      canManage: true,
      canSendLookup: false,
    });
  });

  it("never lets a non-Organizer invite", () => {
    expect(gameInviteAccess({ ...base, isOrganizer: false }).canManage).toBe(
      false,
    );
  });
});

describe("gameInviteLinkStage", () => {
  const ready = {
    viewerPassesLevelRange: true,
    partnerRequiredJoin: false,
    needsSeatPick: false,
  };

  it("checks the Level range first, then partner, then seat", () => {
    expect(
      gameInviteLinkStage({ ...ready, viewerPassesLevelRange: false }, true),
    ).toBe("level_range");
    expect(
      gameInviteLinkStage(
        { ...ready, partnerRequiredJoin: true, needsSeatPick: true },
        true,
      ),
    ).toBe("partner");
    expect(gameInviteLinkStage({ ...ready, needsSeatPick: true }, true)).toBe(
      "seat_pick",
    );
    expect(gameInviteLinkStage(ready, true)).toBe("accept");
  });

  it("asks a signed-in joiner of a football Game how they play", () => {
    const football = {
      players: [],
      sideSize: 5,
      playersAllowed: 10,
      pricePerPlayerFils: null,
      teamsSet: false,
      preferred: { role: null, position: null },
    };
    expect(gameInviteLinkStage({ ...ready, football }, true)).toBe("football");
    expect(gameInviteLinkStage({ ...ready, football }, false)).toBe("accept");
    expect(
      gameInviteLinkStage(
        { ...ready, football, viewerPassesLevelRange: false },
        true,
      ),
    ).toBe("level_range");
  });

  it("does not gate a signed-out visitor on Level range", () => {
    expect(
      gameInviteLinkStage({ ...ready, viewerPassesLevelRange: false }, false),
    ).toBe("accept");
  });
});

describe("groupLookupNote", () => {
  it("names the Group's Organizers", () => {
    expect(groupLookupNote("en")).toContain("Organizers");
  });
});

describe("parseInviteLink", () => {
  it("reads a token link of each kind", () => {
    expect(
      parseInviteLink("https://temba.example/invites/game/link/abc123"),
    ).toEqual({ kind: "game", token: "abc123" });
    expect(parseInviteLink("/invites/team/link/t-1?x=1")).toEqual({
      kind: "team",
      token: "t-1",
    });
    expect(
      parseInviteLink(" https://temba.example/invites/group/link/c9/ "),
    ).toEqual({ kind: "group", token: "c9" });
    expect(parseInviteLink("/invites/community/link/c9")).toBeNull();
  });

  it("reads Game and Group short links", () => {
    expect(parseInviteLink("https://temba.example/g/AbCd1234")).toEqual({
      kind: "game-short",
      code: "AbCd1234",
    });
    expect(parseInviteLink("https://temba.example/gr/ZyXw9876#top")).toEqual({
      kind: "group-short",
      code: "ZyXw9876",
    });
  });

  it("rejects anything else", () => {
    expect(parseInviteLink("")).toBeNull();
    expect(parseInviteLink("hello")).toBeNull();
    expect(parseInviteLink("https://temba.example/dashboard")).toBeNull();
    expect(
      parseInviteLink("https://temba.example/invites/venue/link/x"),
    ).toBeNull();
  });
});

describe("levelRangeGateAction", () => {
  it("waits on a pending request", () => {
    expect(
      levelRangeGateAction({
        requestStatus: "pending",
        canRequest: false,
        requesting: false,
        locale: "en",
      }),
    ).toEqual({
      kind: "pending-note",
      text: "Request pending. Organizers have not decided yet.",
    });
  });

  it("offers a request, again after a rejection", () => {
    expect(
      levelRangeGateAction({
        requestStatus: null,
        canRequest: true,
        requesting: false,
        locale: "en",
      }),
    ).toEqual({ kind: "button", label: "Request to play", disabled: false });
    expect(
      levelRangeGateAction({
        requestStatus: "rejected",
        canRequest: true,
        requesting: false,
        locale: "en",
      }),
    ).toMatchObject({ label: "Request again" });
  });

  it("disables while sending or when the server says no", () => {
    expect(
      levelRangeGateAction({
        requestStatus: null,
        canRequest: true,
        requesting: true,
        locale: "en",
      }),
    ).toEqual({ kind: "button", label: "Requesting…", disabled: true });
    expect(
      levelRangeGateAction({
        requestStatus: null,
        canRequest: false,
        requesting: false,
        locale: "en",
      }),
    ).toMatchObject({ disabled: true });
  });
});
