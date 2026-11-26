import { describe, expect, it } from "vitest";

import {
  seriesEditionCard,
  seriesTableBadges,
  type SeriesEditionCardInput,
} from "./series-edition-card-model";

type Winner = SeriesEditionCardInput["winners"][number];

function winner(overrides: Partial<Winner> & Pick<Winner, "name">): Winner {
  return {
    userId: overrides.name,
    isViewer: false,
    gameTeamId: "team-1",
    winCount: 1,
    tally: "new",
    levelWith: null,
    ...overrides,
  };
}

const qasim = winner({
  name: "Qasim Albaqali",
  winCount: 3,
  tally: "level",
  levelWith: { name: "Layla Haddad" },
});
const ahmed = winner({ name: "Ahmed Buhazza" });

function edition(
  overrides: Partial<SeriesEditionCardInput> = {},
): SeriesEditionCardInput {
  return {
    series: {
      id: "series-1",
      name: "Sunday Social",
      emblem: "cup",
      colour: "gold",
      groupName: "Tuesday Night Padel",
      endedAt: null,
    },
    edition: 12,
    rule: "table",
    state: "won",
    lastWinners: null,
    canOpenSeries: true,
    winners: [qasim, ahmed],
    winnerBib: null,
    ...overrides,
  };
}

describe("seriesEditionCard", () => {
  it("is the Part of card until the Edition is decided", () => {
    const card = seriesEditionCard(
      edition({ state: "upcoming", winners: [] }),
      "social",
      "en",
    );
    expect(card?.kind).toBe("partOf");
  });

  it("is nothing without a Series", () => {
    expect(seriesEditionCard(null, "social", "en")).toBeNull();
    expect(seriesEditionCard(undefined, "played", "en")).toBeNull();
  });

  it("leads a won Social with both winners and a block each (design 3a)", () => {
    expect(seriesEditionCard(edition(), "social", "en")).toEqual({
      kind: "winners",
      model: {
        emblem: "cup",
        colour: "gold",
        title: "Sunday Social, edition 12",
        names: ["Qasim Albaqali", "Ahmed Buhazza"],
        blocks: [
          {
            key: "Qasim Albaqali",
            ordinal: "Qasim’s 3rd",
            tally: "most of anyone, level with Layla",
          },
          {
            key: "Ahmed Buhazza",
            ordinal: "Ahmed’s 1st",
            tally: "new on the profile",
          },
        ],
        spoken:
          "Sunday Social, edition 12. Winners: Qasim Albaqali, Ahmed Buhazza",
        seriesId: "series-1",
      },
    });
  });

  it("names the one Americano winner with one block", () => {
    const card = seriesEditionCard(
      edition({
        rule: "americano",
        winners: [winner({ name: "Reem Fakhro", gameTeamId: null })],
      }),
      "social",
      "en",
    );
    expect(card?.kind === "winners" && card.model).toMatchObject({
      names: ["Reem Fakhro"],
      blocks: [{ ordinal: "Reem’s 1st", tally: "new on the profile" }],
    });
  });

  it("names each Pool's winning team and only the viewer's own block", () => {
    const card = seriesEditionCard(
      edition({
        rule: "tables",
        winners: [
          winner({ name: "Qasim Albaqali", gameTeamId: "a" }),
          winner({ name: "Ahmed Buhazza", gameTeamId: "a" }),
          winner({
            name: "Hassan Haji",
            gameTeamId: "b",
            isViewer: true,
            winCount: 2,
            tally: null,
          }),
          winner({ name: "Khalid Janahi", gameTeamId: "b" }),
        ],
      }),
      "social",
      "en",
    );
    expect(card?.kind === "winners" && card.model).toMatchObject({
      names: ["Qasim A & Ahmed B", "Hassan H & Khalid J"],
      blocks: [{ key: "Hassan Haji", ordinal: "Your 2nd", tally: null }],
      spoken:
        "Sunday Social, edition 12. Winners: Qasim A & Ahmed B, Hassan H & Khalid J",
    });
  });

  it("has no block when the viewer is not among several teams' winners", () => {
    const card = seriesEditionCard(
      edition({
        rule: "tables",
        winners: [
          winner({ name: "Qasim Albaqali", gameTeamId: "a" }),
          winner({ name: "Ahmed Buhazza", gameTeamId: "a" }),
          winner({ name: "Hassan Haji", gameTeamId: "b" }),
          winner({ name: "Khalid Janahi", gameTeamId: "b" }),
        ],
      }),
      "social",
      "en",
    );
    expect(card?.kind === "winners" && card.model.blocks).toEqual([]);
  });

  it("follows the server's winners when a corrected score moves the win", () => {
    const corrected = seriesEditionCard(
      edition({
        winners: [
          winner({ name: "Reem Fakhro", gameTeamId: "team-2" }),
          winner({ name: "Noor Ali", gameTeamId: "team-2" }),
        ],
      }),
      "social",
      "en",
    );
    expect(corrected?.kind === "winners" && corrected.model.names).toEqual([
      "Reem Fakhro",
      "Noor Ali",
    ]);
  });

  it("hides See the series when the viewer may not open it", () => {
    const card = seriesEditionCard(
      edition({ canOpenSeries: false }),
      "social",
      "en",
    );
    expect(card?.model.seriesId).toBeNull();
  });

  it("puts a won Played game under its hero with the viewer's ordinal", () => {
    const card = seriesEditionCard(
      edition({
        rule: "side",
        winners: [
          { ...qasim, isViewer: true, winCount: 2 },
          { ...ahmed, isViewer: false },
        ],
      }),
      "played",
      "en",
    );
    expect(card).toEqual({
      kind: "result",
      model: {
        emblem: "cup",
        colour: "gold",
        title: "Sunday Social, edition 12",
        line: "Won by Qasim A and Ahmed B",
        ordinal: "Your 2nd",
        spoken:
          "Sunday Social, edition 12. Won by Qasim A and Ahmed B. Your 2nd",
        seriesId: "series-1",
      },
    });
  });

  it("names a football Game's winning side by its Bib colour", () => {
    const card = seriesEditionCard(
      edition({
        rule: "side",
        winners: [qasim, ahmed, winner({ name: "Hassan Haji" })],
        winnerBib: "black",
      }),
      "played",
      "en",
    );
    expect(card?.kind === "result" && card.model).toMatchObject({
      line: "Won by Black",
      ordinal: null,
    });
  });

  it("says nobody won a drawn Friendly game", () => {
    const card = seriesEditionCard(
      edition({ rule: "side", state: "no_winner", winners: [] }),
      "played",
      "en",
    );
    expect(card?.kind === "result" && card.model).toMatchObject({
      line: "A draw. Nobody wins edition 12.",
      ordinal: null,
      spoken: "Sunday Social, edition 12. A draw. Nobody wins edition 12.",
    });
  });

  it("reads ordinals and the Edition number in Arabic", () => {
    const won = seriesEditionCard(edition(), "social", "ar");
    expect(won?.kind === "winners" && won.model.title).toContain("12");
    expect(won?.kind === "winners" && won.model.spoken).toContain("الفائزون");
    const drawn = seriesEditionCard(
      edition({ rule: "side", state: "no_winner", winners: [] }),
      "played",
      "ar",
    );
    expect(drawn?.kind === "result" && drawn.model.line).toBe(
      "تعادل. لا أحد يفوز بالنسخة 12.",
    );
  });
});

describe("seriesTableBadges", () => {
  it("badges the winners' Game teams and players with the note", () => {
    const badges = seriesTableBadges(edition(), "en");
    expect(badges?.gameTeamIds).toEqual(new Set(["team-1"]));
    expect(badges?.userIds).toEqual(
      new Set(["Qasim Albaqali", "Ahmed Buhazza"]),
    );
    expect(badges?.note).toBe(
      "The series goes to the top of the table once the last round is saved. If the organizer corrects a score, it follows the table.",
    );
  });

  it("badges each Pool's winning team", () => {
    const badges = seriesTableBadges(
      edition({
        rule: "tables",
        winners: [
          winner({ name: "Qasim Albaqali", gameTeamId: "a" }),
          winner({ name: "Ahmed Buhazza", gameTeamId: "a" }),
          winner({ name: "Hassan Haji", gameTeamId: "b" }),
          winner({ name: "Khalid Janahi", gameTeamId: "b" }),
        ],
      }),
      "en",
    );
    expect(badges?.gameTeamIds).toEqual(new Set(["a", "b"]));
  });

  it("keeps the note and badges no row before the Edition is decided", () => {
    const badges = seriesTableBadges(
      edition({ state: "upcoming", winners: [] }),
      "en",
    );
    expect(badges?.gameTeamIds.size).toBe(0);
    expect(badges?.note).toBeTruthy();
  });

  it("is nothing where the table does not decide the Edition", () => {
    expect(seriesTableBadges(edition({ rule: "champion" }), "en")).toBeNull();
    expect(seriesTableBadges(edition({ rule: "king" }), "en")).toBeNull();
    expect(seriesTableBadges(edition({ rule: "side" }), "en")).toBeNull();
    expect(seriesTableBadges(null, "en")).toBeNull();
  });
});
