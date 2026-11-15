import {
  formatMarksClose,
  givableKinds,
  marksClosedCopy,
  type GameMarks,
} from "@repo/domain/marks";
import {
  MARKS_FIXTURE_VIEWER_ID,
  createMarksFixtures,
} from "@repo/domain/marks-fixtures";
import { isolate } from "@repo/i18n/bidi";
import { describe, expect, it } from "vitest";

import {
  closedCardModel,
  coinGiversModel,
  firstName,
  giveRowModel,
  givePlayersModel,
  markErrorCopy,
  markPickModel,
  marksSectionVisible,
  msUntilMarksClose,
  mvpErrorCopy,
  mvpRowModel,
  pickSheetModel,
  rosterModel,
  voteSheetModel,
} from "./marks-model";

const NOW = new Date("2026-11-06T16:00:00Z");
const HOUR_MS = 60 * 60 * 1000;
const fixtures = createMarksFixtures(NOW);
const viewer = MARKS_FIXTURE_VIEWER_ID;

function closesOf(data: GameMarks) {
  if (!data.window) {
    throw new Error("fixture has no window");
  }
  return formatMarksClose(data.window.closesAt, "en");
}

describe("firstName", () => {
  it("takes the first word, as typed", () => {
    expect(firstName("Yousif Kadhem")).toBe("Yousif");
    expect(firstName("  Bo ")).toBe("Bo");
    expect(firstName("حسن حاجي")).toBe("حسن");
  });
});

describe("marksSectionVisible", () => {
  it("is absent before completion and on a closed Game with nothing to show", () => {
    expect(marksSectionVisible(undefined)).toBe(false);
    expect(marksSectionVisible(fixtures.notCompleted)).toBe(false);
    expect(
      marksSectionVisible({
        ...fixtures.closed,
        marks: [],
        summary: { given: 0, givers: 0 },
      }),
    ).toBe(false);
  });

  it("shows while the window is open, and after it closes with marks or an MVP", () => {
    expect(marksSectionVisible(fixtures.openNoneGiven)).toBe(true);
    expect(marksSectionVisible(fixtures.closed)).toBe(true);
    expect(
      marksSectionVisible({
        ...fixtures.mvpDecided,
        marks: [],
        summary: { given: 0, givers: 0 },
      }),
    ).toBe(true);
  });
});

describe("mvpRowModel", () => {
  it("shows the vote progress and Vote while the vote is open", () => {
    const data = fixtures.mvpVoting;
    expect(mvpRowModel(data, "en")).toEqual({
      state: "pending",
      title: "MVP not decided yet",
      line: `Players vote. 2 of 4 have voted, closes ${closesOf(data)}`,
      userId: null,
      action: { sheet: "vote", label: "Vote" },
    });
  });

  it("is absent in No MVP mode and once the window closed with no MVP", () => {
    expect(mvpRowModel(fixtures.mvpNone, "en")).toBeNull();
    expect(mvpRowModel(fixtures.closed, "en")).toBeNull();
    expect(mvpRowModel(fixtures.notCompleted, "en")).toBeNull();
  });

  it("closes the vote with the Rating window on a Match that counts for Temba Level", () => {
    const data = fixtures.mvpVoting;
    const closesAt = new Date(data.window!.opensAt.getTime() + 24 * HOUR_MS);
    expect(
      mvpRowModel({ ...data, mvp: { ...data.mvp, closesAt } }, "en")?.line,
    ).toBe(
      `Players vote. 2 of 4 have voted, closes ${formatMarksClose(closesAt, "en")}`,
    );
    expect(
      mvpRowModel(
        {
          ...data,
          mvp: { ...data.mvp, state: "none", settledAt: closesAt },
        },
        "en",
      ),
    ).toBeNull();
  });

  it("asks the Organizer to break a tie", () => {
    expect(mvpRowModel(fixtures.mvpTie, "en")).toMatchObject({
      state: "pending",
      line: "Tied vote, 2 players. Pick the MVP.",
      action: { sheet: "pick", label: "Pick the MVP" },
    });
  });

  it("tells a player the tie went to the organizer, without naming the tied", () => {
    const data: GameMarks = {
      ...fixtures.mvpTie,
      viewer: {
        ...fixtures.mvpTie.viewer,
        isOrganizer: false,
        canPickMvp: false,
      },
      mvp: { ...fixtures.mvpTie.mvp, tiedUserIds: null },
    };
    expect(mvpRowModel(data, "en")).toMatchObject({
      line: `Tied vote. The organizer picks, closes ${closesOf(data)}`,
      action: null,
    });
  });

  it("names the settled MVP with how and their goals and marks (2f)", () => {
    expect(mvpRowModel(fixtures.mvpDecided, "en")).toEqual({
      state: "decided",
      title: "Yousif Kadhem, MVP",
      line: "By vote, 4 of 6. 3 goals and 2 marks",
      userId: "user-yousif",
      action: null,
    });
  });

  it("shows an Organizer's pick as changeable until the close", () => {
    const data = fixtures.mvpOrganizerPick;
    expect(mvpRowModel(data, "en")).toMatchObject({
      state: "decided",
      line: `Organizer’s pick, can change until ${closesOf(data)}. 3 goals`,
      action: { sheet: "pick", label: "Change pick" },
    });
  });

  it("keeps a typed name apart in Arabic", () => {
    expect(mvpRowModel(fixtures.mvpDecided, "ar")?.title).toBe(
      `${isolate("Yousif Kadhem")}، نجم المباراة`,
    );
  });
});

describe("giveRowModel", () => {
  it("offers Choose a player with the count left and the close", () => {
    const data = fixtures.openNoneGiven;
    expect(giveRowModel(data, "en")).toEqual({
      title: "Give your marks",
      line: `3 to give, one per player. Closes ${closesOf(data)}`,
      coins: [],
      actionLabel: "Choose a player",
    });
  });

  it("hides Choose a player once all three are given (E3)", () => {
    const data = fixtures.capReached;
    expect(giveRowModel(data, "en")).toEqual({
      title: "You gave 3 of 3",
      line: `Smash Machine to Ali, Good Game to Bo, Mr Ice to Khalid. Closes ${closesOf(data)}`,
      coins: ["smash_machine", "good_game", "mr_ice"],
      actionLabel: "Edit",
    });
  });

  it("is absent for a viewer who did not play and once the window closes", () => {
    expect(giveRowModel(fixtures.spectator, "en")).toBeNull();
    expect(giveRowModel(fixtures.closed, "en")).toBeNull();
  });
});

describe("closedCardModel", () => {
  it("says what the viewer gave and when it closed (2f)", () => {
    const data = fixtures.closed;
    const closed = marksClosedCopy(data.window!.closesAt, "en");
    expect(closedCardModel(data, "en")).toEqual({
      title: "You gave 2 of 3",
      line: `Dynamo to Yousif, Good Game to Bo. ${closed}`,
      coins: ["dynamo", "good_game"],
    });
  });

  it("is absent while open and for a viewer who did not play", () => {
    expect(closedCardModel(fixtures.openSomeGiven, "en")).toBeNull();
    expect(
      closedCardModel(
        {
          ...fixtures.closed,
          viewer: { ...fixtures.closed.viewer, isParticipant: false },
        },
        "en",
      ),
    ).toBeNull();
  });
});

describe("rosterModel", () => {
  it("lists both sides with each participant's coins and count", () => {
    const roster = rosterModel(fixtures.openSomeGiven, "en");
    expect(roster.title).toBe("Marks so far");
    expect(roster.meta).toBe("2 given by 2 players");
    expect(roster.sides.map((side) => side.label)).toEqual([
      "Team A",
      "Team B",
    ]);
    const [own, other] = roster.sides;
    expect(own?.rows.find((row) => row.isViewer)).toMatchObject({
      name: "You",
      coins: ["great_wall"],
      count: "×1",
    });
    expect(own?.rows.find((row) => row.userId === "user-ali")).toMatchObject({
      coins: ["dynamo"],
      coinsSpoken: "Marks for Ali Mansoor: Dynamo ×1. Show who gave them",
    });
    expect(other?.rows.map((row) => row.coins)).toEqual([[], []]);
    expect(roster.footnote).toMatch(/^Tap a coin/);
  });

  it("puts the gold coin first on the settled MVP's row (2f)", () => {
    const roster = rosterModel(fixtures.mvpDecided, "en");
    expect(roster.title).toBe("Marks");
    expect(roster.sides.map((side) => side.label)).toEqual(["Black", "White"]);
    const yousif = roster.sides[0]?.rows.find(
      (row) => row.userId === "user-yousif",
    );
    expect(yousif).toMatchObject({
      sub: "3 goals, MVP",
      coins: ["mvp", "dynamo", "good_game"],
      count: "×2",
    });
  });

  it("names an Unclaimed player as not on Temba yet (E9)", () => {
    const khalid = rosterModel(
      fixtures.unclaimedReceiver,
      "en",
    ).sides[1]?.rows.find((row) => row.userId === "user-khalid");
    expect(khalid).toMatchObject({
      sub: "Not on Temba yet",
      coins: ["underdog"],
    });
  });

  it("has no footnote with no coins, and keeps counts left to right in Arabic", () => {
    expect(rosterModel(fixtures.mvpVoting, "en").footnote).toBeNull();
    const roster = rosterModel(fixtures.openSomeGiven, "ar");
    expect(roster.sides[0]?.rows.find((row) => row.isViewer)?.count).toBe("×1");
  });
});

describe("givePlayersModel", () => {
  it("groups everyone but the viewer, own side first, with Take back on the marked (2b)", () => {
    const model = givePlayersModel(fixtures.openSomeGiven, "en");
    expect(model.title).toBe("Who earned one?");
    expect(model.subtitle).toBe(
      "2 marks left. One per player, and not yourself.",
    );
    expect(model.groups.map((group) => [group.title, group.caption])).toEqual([
      ["Your side, Team A", "teammate marks and shared marks"],
      ["Other side, Team B", "opponent marks and shared marks"],
    ]);
    const userIds = model.groups.flatMap((group) =>
      group.rows.map((row) => row.userId),
    );
    expect(userIds).not.toContain(viewer);
    expect(model.groups[0]?.rows[0]).toMatchObject({
      userId: "user-ali",
      given: "dynamo",
      givenName: "Dynamo",
      retractSpoken: "Take back Dynamo from Ali Mansoor",
      canPick: false,
    });
    expect(model.groups[1]?.rows.every((row) => row.canPick)).toBe(true);
  });

  it("offers nobody new once all three are given", () => {
    const model = givePlayersModel(fixtures.capReached, "en");
    expect(model.subtitle).toBe(
      "No marks left. Take one back to give it to someone else.",
    );
    expect(
      model.groups.flatMap((group) => group.rows).some((row) => row.canPick),
    ).toBe(false);
  });

  it("uses the Bib names on football", () => {
    const model = givePlayersModel(fixtures.football, "en");
    expect(model.groups.map((group) => group.title)).toEqual([
      "Your side, Black",
      "Other side, White",
    ]);
    expect(
      model.groups[1]?.rows.find((row) => row.userId === "user-khalid")?.sub,
    ).toBe("Keeper");
  });
});

describe("markPickModel", () => {
  const offered = (model: ReturnType<typeof markPickModel>) =>
    model?.groups.flatMap((group) => group.kinds.map((choice) => choice.kind));

  it("offers exactly the givable kinds for a teammate, Roasts apart (2c)", () => {
    const model = markPickModel(fixtures.openNoneGiven, "user-ali", null, "en");
    expect(offered(model)?.sort()).toEqual(
      givableKinds({ sport: "padel", relation: "teammate" }).sort(),
    );
    expect(model?.title).toBe("A mark for Ali");
    expect(model?.subtitle).toBe(
      "Teammate. Pick one, they’ll see who it came from.",
    );
    expect(model?.groups.map((group) => [group.title, group.caption])).toEqual([
      ["For a teammate", null],
      ["Roasts", "they can hide these from their profile"],
    ]);
    expect(model?.footnote).toBe(
      "Goal Machine isn’t here: it’s football only. Opponent marks like The Great Wall only show when you pick someone from the other side.",
    );
    expect(model?.picked).toBeNull();
  });

  it("offers the opponent group and no Roasts for the other side (E7)", () => {
    const model = markPickModel(fixtures.football, "user-bo", null, "en");
    expect(offered(model)?.sort()).toEqual(
      givableKinds({ sport: "football", relation: "opponent" }).sort(),
    );
    expect(model?.groups.map((group) => group.key)).toEqual(["main"]);
    expect(model?.footnote).toBe(
      "Smash Machine isn’t here: it’s padel only. Teammate marks like Dynamo only show when you pick someone from your side.",
    );
  });

  it("updates the picked line, the count left and the CTA with the pick", () => {
    const model = markPickModel(
      fixtures.openNoneGiven,
      "user-ali",
      "dynamo",
      "en",
    );
    expect(model?.picked).toEqual({
      line: "Dynamo for Ali Mansoor",
      remaining: "2 left after this",
      cta: "Give Dynamo",
    });
    expect(
      markPickModel(fixtures.openNoneGiven, "user-ali", "great_wall", "en")
        ?.picked,
    ).toBeNull();
  });

  it("never offers the viewer (E5)", () => {
    expect(
      markPickModel(fixtures.openNoneGiven, viewer, null, "en"),
    ).toBeNull();
  });
});

describe("voteSheetModel", () => {
  it("shows the progress and the viewer's current vote, never a tally (2d)", () => {
    const data = fixtures.mvpVoting;
    const model = voteSheetModel(data, null, "en");
    expect(model.title).toBe("Vote for the MVP");
    expect(model.subtitle).toBe(
      `One vote, either side, not yourself. Votes stay hidden until it closes ${closesOf(data)}.`,
    );
    expect(model.progress).toBe("2 of 4 have voted");
    expect(model.tieRule).toBe("Tie goes to the organizer");
    expect(model.current).toBe(
      "Your vote: Ali Mansoor. You can change it until it closes.",
    );
    expect(model.selected).toBe("user-ali");
    expect(model.cta).toEqual({ label: "Vote for Ali", enabled: false });
    expect(model.rows.map((row) => row.userId)).toEqual([
      "user-ali",
      "user-bo",
      "user-khalid",
    ]);
    expect(Object.keys(model.rows[0] ?? {})).not.toContain("votes");
  });

  it("enables the CTA for a new pick", () => {
    const model = voteSheetModel(fixtures.mvpVoting, "user-bo", "en");
    expect(model.cta).toEqual({ label: "Vote for Bo", enabled: true });
  });
});

describe("pickSheetModel", () => {
  it("sorts by marks then goals with the hints, and leaves the Organizer out (2e)", () => {
    const model = pickSheetModel(fixtures.football, null, "en");
    expect(model.rows.map((row) => row.userId)).toEqual([
      "user-yousif",
      "user-hamad",
      "user-bo",
      "user-khalid",
      "user-omar",
    ]);
    expect(model.rows[0]).toMatchObject({
      sub: "3 goals, Black",
      marks: "2 marks",
    });
    expect(model.rows[3]?.sub).toBe("Keeper, White");
    expect(model.subtitle).toBe(
      "You set this game to organizer’s pick. Marks and goals are hints, the call is yours.",
    );
    expect(model.footnote).toMatch(/^Sorted by marks received/);
  });

  it("keeps the current pick and names the new one in the CTA", () => {
    const data = fixtures.mvpOrganizerPick;
    expect(pickSheetModel(data, null, "en").cta).toEqual({
      label: "Make Yousif the MVP",
      enabled: false,
    });
    expect(pickSheetModel(data, "user-bo", "en").cta).toEqual({
      label: "Make Bo the MVP",
      enabled: true,
    });
  });

  it("offers only the tied players in a tie", () => {
    const model = pickSheetModel(fixtures.mvpTie, null, "en");
    expect(model.rows.map((row) => row.userId).sort()).toEqual(
      [viewer, "user-ali"].sort(),
    );
    expect(model.subtitle).toBe("Tied vote, 2 players. Pick the MVP.");
    expect(model.footnote).toBeNull();
    expect(model.cta).toEqual({ label: "Pick the MVP", enabled: false });
  });
});

describe("coinGiversModel", () => {
  it("lists the givers of each coin with teammate or opponent (E24)", () => {
    const model = coinGiversModel(fixtures.football, "user-hamad", "en");
    expect(model).toEqual({
      title: "Marks for Hamad A",
      kinds: [
        {
          kind: "great_wall",
          name: "The Great Wall",
          count: "×1",
          note: null,
          givers: [
            {
              userId: "user-bo",
              name: "Bo Fareed",
              image: null,
              relation: "Opponent",
            },
          ],
        },
      ],
    });
    expect(
      coinGiversModel(fixtures.football, "user-yousif", "en")?.kinds.flatMap(
        (kind) => kind.givers.map((giver) => giver.relation),
      ),
    ).toEqual(["Teammate", "Teammate"]);
  });

  it("explains the gold coin by how it was decided", () => {
    const model = coinGiversModel(fixtures.mvpDecided, "user-yousif", "en");
    expect(model?.kinds[0]).toMatchObject({
      kind: "mvp",
      note: "By vote, 4 of 6",
      givers: [],
    });
  });
});

describe("refused copy", () => {
  it("reads the server's reason code, falling back for anything else", () => {
    expect(markErrorCopy("cap_reached", "en")).toBe(
      "You’ve given all your marks for this game.",
    );
    expect(markErrorCopy("Mark not found", "en")).toBe("Something went wrong.");
    expect(mvpErrorCopy("closed", "en")).toBe("The MVP is no longer open.");
    expect(mvpErrorCopy("window_closed", "en")).toBe("Something went wrong.");
  });
});

describe("msUntilMarksClose", () => {
  it("counts down to the close of an open window only", () => {
    expect(msUntilMarksClose(fixtures.openNoneGiven, NOW)).toBe(38 * HOUR_MS);
    expect(
      msUntilMarksClose(
        fixtures.openNoneGiven,
        new Date(NOW.getTime() + 40 * HOUR_MS),
      ),
    ).toBe(0);
    expect(msUntilMarksClose(fixtures.closed, NOW)).toBeNull();
    expect(msUntilMarksClose(fixtures.notCompleted, NOW)).toBeNull();
    expect(msUntilMarksClose(undefined, NOW)).toBeNull();
  });
});
