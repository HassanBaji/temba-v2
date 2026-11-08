import { describe, expect, it } from "vitest";

import {
  gameInviteJoinSheetCopy,
  gameInviteSeatCourt,
  inviteJoinDoor,
} from "./game-invite-join-sheet";

const sides = [
  { sideIndex: 1, left: null, right: { name: "Hassan Haji" } },
  { sideIndex: 2, left: null, right: null },
];

const group = {
  id: "g1",
  name: "Padel games",
  sport: "padel",
  imageUrl: null,
  memberCount: 5,
  memberNames: ["Hassan Haji"],
  joinMode: "join" as const,
  sharedBy: { name: "Hassan Haji" },
  pendingRequest: null,
};

describe("gameInviteSeatCourt", () => {
  it("says what each open seat is, next to who sits", () => {
    const court = gameInviteSeatCourt(sides, "en");
    expect(court.map((side) => side.label)).toEqual(["Team A", "Team B"]);
    expect(
      court[0]?.seats.map((seat) => [seat.occupant?.name ?? null, seat.sub]),
    ).toEqual([
      [null, "Left, or either"],
      ["Hassan Haji", "Right"],
    ]);
    expect(court[1]?.seats[0]?.sub).toBe("Team B, any side");
  });
});

describe("inviteJoinDoor", () => {
  it("holds on an approval Group, asks on the Level gate, else takes the seat", () => {
    expect(
      inviteJoinDoor({
        gate: "approval",
        joinGroup: true,
        levelBlocked: false,
      }),
    ).toBe("hold");
    expect(
      inviteJoinDoor({ gate: "approval", joinGroup: true, levelBlocked: true }),
    ).toBe("hold");
    expect(
      inviteJoinDoor({
        gate: "approval",
        joinGroup: false,
        levelBlocked: true,
      }),
    ).toBe("level_request");
    expect(
      inviteJoinDoor({ gate: "open", joinGroup: true, levelBlocked: false }),
    ).toBe("accept");
    expect(
      inviteJoinDoor({ gate: "none", joinGroup: false, levelBlocked: true }),
    ).toBe("level_request");
  });
});

describe("gameInviteJoinSheetCopy", () => {
  const base = {
    kind: "padel" as const,
    sides,
    picked: { sideIndex: 2, position: "left" as const },
    usualSide: "left" as const,
    teamsMadeAt: null,
    group,
    gate: "open" as const,
    gamePublic: false,
    levelBlocked: false,
    locale: "en" as const,
  };

  it("names the teams, the side and the result", () => {
    const copy = gameInviteJoinSheetCopy(base);
    expect(copy.lead).toBe(
      "Same as joining in the app. Team B, Left, from where you tapped.",
    );
    expect(copy.teams.map((team) => team.meta)).toEqual([
      "with Hassan H, 1 seat",
      "empty, 2 seats",
    ]);
    expect(copy.sideHint).toBe("optional, your usual is Left");
    expect(copy.sideNote(copy.teams[1]!, "left")).toBe(
      "Whoever joins Team B next takes Right, or picks nothing and plays Right by default.",
    );
    expect(copy.groupToggle).toMatchObject({
      label: "Also join Padel games",
      policy: "Anyone with the link can join. 5 members.",
      locked: true,
    });
    expect(
      copy.cta({ joinGroup: true, seat: base.picked, football: null }),
    ).toBe("Sit in Team B, Left");
  });

  it("asks for the seat on an approval Group or outside the Level range", () => {
    const approval = gameInviteJoinSheetCopy({
      ...base,
      gamePublic: true,
      group: { ...group, joinMode: "request" },
      gate: "approval",
    });
    expect(approval.groupToggle?.locked).toBe(false);
    expect(approval.groupToggle?.policy).toContain("held 24 hours");
    expect(
      approval.cta({ joinGroup: true, seat: base.picked, football: null }),
    ).toBe("Request the seat, Team B, Left");
    expect(
      approval.cta({ joinGroup: false, seat: base.picked, football: null }),
    ).toBe("Sit in Team B, Left");
    const level = gameInviteJoinSheetCopy({
      ...base,
      gate: "none",
      group: null,
      levelBlocked: true,
    });
    expect(level.groupToggle).toBeNull();
    expect(level.levelNote).toContain("asks the organizer");
    expect(
      level.cta({
        joinGroup: false,
        seat: { sideIndex: 1, position: "either" },
        football: null,
      }),
    ).toBe("Request the seat, Team A, Either");
  });

  it("writes the football sheet in Arabic", () => {
    const copy = gameInviteJoinSheetCopy({
      ...base,
      kind: "football",
      sides: [],
      picked: null,
      teamsMadeAt: null,
      locale: "ar",
    });
    expect(copy.lead).toBe(
      "كما في التطبيق. اختر دورًا ومركزًا مفضّلًا؛ الفرق تأتي لاحقًا.",
    );
    expect(
      copy.cta({
        joinGroup: true,
        seat: null,
        football: { role: "keeper", position: "mid" },
      }),
    ).toBe("اجلس في حارس");
  });
});
