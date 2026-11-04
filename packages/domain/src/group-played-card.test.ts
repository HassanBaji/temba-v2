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
