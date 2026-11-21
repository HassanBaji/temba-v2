import { describe, expect, it } from "vitest";

import { createGroupFixtures } from "./group-fixtures";
import {
  groupPlayedCard,
  groupPlayedFilterChips,
  groupPlayedListItems,
  groupPlayedRecordLine,
} from "./group-played-card";

const { home } = createGroupFixtures(new Date("2026-03-10T12:00:00Z"));

describe("groupPlayedCard", () => {
  const [won, lost, unscored, cancelled] = home.member.gameHistory.map((game) =>
    groupPlayedCard(game, "en"),
  );

  it("titles an unnamed padel Game with the two pairs, the viewer's first", () => {
    expect(won).toMatchObject({
      status: "finished",
      title: "You & Ada L vs Kim H & Elin N",
      result: { mark: "won", label: "Won" },
    });
    expect(lost!.title).toBe("You & Ada L vs Kim H & Elin N");
  });

  it("draws games per set with the won sets strong", () => {
    const [viewer, other] = won!.sides!;
    expect(viewer.cells).toEqual([
      { value: "6", strong: true },
      { value: "4", strong: false },
      { value: "7", strong: true },
    ]);
    expect(other.cells.map((cell) => cell.strong)).toEqual([
      false,
      true,
      false,
    ]);
    expect(lost!.sides![0].cells.map((cell) => cell.value)).toEqual(["2", "3"]);
  });

  it("leads with a custom Game name", () => {
    const card = groupPlayedCard(
      {
        ...home.member.gameHistory[0]!,
        name: "Sunday ladder",
        hasCustomName: true,
      },
      "en",
    );
    expect(card.title).toBe("Sunday ladder");
  });

  it("reads football as goals per bib, slot order kept", () => {
    const card = groupPlayedCard(
      {
        ...home.member.gameHistory[1]!,
        sport: "football",
        slot1Bib: "red",
        slot2Bib: null,
        scoredSets: [{ slot1GamesWon: 9, slot2GamesWon: 12 }],
      },
      "en",
    );
    expect(card.title).toBe("Red vs White");
    expect(card.sides!.map((side) => [side.name, side.bib])).toEqual([
      ["Red", "red"],
      ["White", "white"],
    ]);
    expect(card.sides![1]).toMatchObject({
      isViewerSide: true,
      cells: [{ value: "12", strong: true }],
    });
  });

  it("asks for a score on an unscored Game", () => {
    expect(unscored).toMatchObject({ status: "needs_score", result: null });
    expect(unscored!.sides![0].cells).toEqual([{ value: "–", strong: false }]);
    expect(unscored!.accessibilityLabel).toContain("No score yet");
  });

  it("reads a cancelled Game with its sign-ups and no teams", () => {
    expect(cancelled).toMatchObject({
      status: "cancelled",
      sides: null,
      cancelledLine: "Padel Pro Arad, 4 of 4 joined",
    });
  });
});

describe("a drawn Social on the Played list", () => {
  const americano = {
    ...home.member.gameHistory[0]!,
    name: "Friday Americano",
    hasCustomName: true,
    venueName: "World Padel Academy",
    courtName: "5",
    slot1Members: [],
    slot2Members: [],
    scoredSets: [{ slot1GamesWon: 0, slot2GamesWon: 6 }],
    viewerSlot: null,
    outcome: null,
    social: {
      tournamentShape: "americano",
      entrantCount: 8,
      finished: true,
      winner: { names: ["Jassim Ghuloom"], isViewer: false },
      americano: null,
      myTournament: null,
      king: null,
      ratingScope: "unrated" as const,
    },
  };

  it("reads as the whole day, never as one Match between open seats", () => {
    const card = groupPlayedCard(americano, "en");
    expect(card.sides).toBeNull();
    expect(card.result).toBeNull();
    expect(card.whenLine.endsWith("World Padel Academy")).toBe(true);
    expect(card.social).toMatchObject({
      tags: ["Social", "Americano"],
      headline: "Finished",
      summary: "World Padel Academy, 8 players",
      winner: { markName: "Jassim Ghuloom", line: "Won by Jassim Ghuloom" },
    });
    expect(card.accessibilityLabel).toContain(
      "8 players. Won by Jassim Ghuloom",
    );
  });

  it("counts teams and names the winning pair on every other shape", () => {
    const card = groupPlayedCard(
      {
        ...americano,
        social: {
          ...americano.social,
          tournamentShape: "groups_only",
          entrantCount: 4,
          finished: false,
          winner: { names: ["Ada Lovelace", "Kim Hart"], isViewer: true },
        },
      },
      "en",
    );
    expect(card.social).toMatchObject({
      tags: ["Social", "Groups only"],
      headline: "Results to come",
      summary: "World Padel Academy, 4 teams",
      winner: { isViewer: true, line: "Won by Ada L & Kim H" },
    });
  });

  it("tags a Rounds Social and a King of the court with their shape", () => {
    const rounds = groupPlayedCard(
      {
        ...americano,
        social: { ...americano.social, tournamentShape: "rounds" },
      },
      "en",
    );
    expect(rounds.social?.tags).toEqual(["Social", "Rounds"]);
    const king = groupPlayedCard(
      {
        ...americano,
        scoredSets: [],
        resultPosted: false,
        social: {
          ...americano.social,
          tournamentShape: "king_of_the_court",
          entrantCount: 8,
          finished: false,
          winner: null,
        },
      },
      "en",
    );
    expect(king).toMatchObject({
      status: "needs_score",
      sides: null,
      social: {
        tags: ["Social", "King of the court"],
        headline: "Final order to come",
        summary: "World Padel Academy, 8 teams",
        winner: null,
      },
    });
  });

  it("keeps the cancelled card for a cancelled Social", () => {
    const card = groupPlayedCard({ ...americano, cancelled: true }, "en");
    expect(card.status).toBe("cancelled");
    expect(card.social).toBeNull();
  });
});

describe("groupPlayedListItems", () => {
  it("heads each month with its Game count", () => {
    const items = groupPlayedListItems(
      home.member.gameHistory,
      "en",
      new Date("2026-03-10T12:00:00Z"),
    );
    const heads = items.filter((item) => item.kind === "month");
    expect(heads.map((head) => [head.label, head.count])).toEqual([
      ["March", "1 GAME"],
      ["February", "3 GAMES"],
    ]);
    expect(items).toHaveLength(6);
  });
});

describe("groupPlayedFilterChips", () => {
  it("lists the four filters with counts and marks the selected one", () => {
    const chips = groupPlayedFilterChips(
      home.member.gameHistoryCounts,
      "finished",
      "en",
    );
    expect(
      chips.map((chip) => [chip.label, chip.count, chip.selected, chip.dot]),
    ).toEqual([
      ["Finished", "2", true, false],
      ["Needs score", "1", false, true],
      ["Cancelled", "1", false, false],
      ["All", "4", false, false],
    ]);
  });
});

describe("groupPlayedRecordLine", () => {
  it("shows draws for football only", () => {
    const counts = home.member.gameHistoryCounts;
    expect(groupPlayedRecordLine(counts, "padel", "en")?.text).toBe("W1 L1");
    expect(groupPlayedRecordLine(counts, "football", "en")?.text).toBe(
      "W1 D0 L1",
    );
  });
});
