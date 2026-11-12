import { describe, expect, it } from "vitest";

import type { ComputedPoolTable, PoolTableRow } from "./pool-table";
import {
  createKnockoutTournamentFixtures,
  createTournamentFixtures,
  type TournamentFixture,
} from "./tournament-details-fixtures";
import {
  confirmedMatchCount,
  isTournamentFinished,
  tournamentFinishedView,
  tournamentShareCard,
} from "./tournament-finished";

const NOW = new Date("2026-11-08T08:00:00Z");
const pools = createTournamentFixtures(NOW);
const knockouts = createKnockoutTournamentFixtures(NOW);

/** The same day seen by another User: every "is this you" flag follows them. */
function viewing(game: TournamentFixture, userId: string): TournamentFixture {
  const teamId =
    game.gameTeams.find((team) =>
      team.members.some((member) => member.id === userId),
    )?.id ?? null;
  const side = <T extends { kind: string }>(entry: T): T =>
    entry.kind === "team" && "team" in entry
      ? ({
          ...entry,
          team: {
            ...(entry.team as { gameTeamId: string }),
            isViewer:
              (entry.team as { gameTeamId: string }).gameTeamId === teamId,
          },
        } as T)
      : entry;
  return {
    ...game,
    viewerUserId: userId,
    poolTables: game.poolTables && {
      ...game.poolTables,
      viewerPoolIndex:
        game.poolTables.pools.find((pool) =>
          pool.rows.some((row) => row.gameTeamId === teamId),
        )?.poolIndex ?? null,
      pools: game.poolTables.pools.map((pool) => ({
        ...pool,
        rows: pool.rows.map((row) => ({
          ...row,
          isViewer: row.gameTeamId === teamId,
        })),
      })),
    },
    knockout:
      game.knockout?.map((round) => ({
        ...round,
        places: round.places.map((place) =>
          place.kind === "match"
            ? { ...place, slot1: side(place.slot1), slot2: side(place.slot2) }
            : { ...place, side: side(place.side) },
        ),
      })) ?? null,
  };
}

function row(
  position: number,
  gameTeamId: string,
  record: { won: number; drawn: number; lost: number },
  isViewer = false,
): PoolTableRow {
  return {
    position,
    gameTeamId,
    name: gameTeamId,
    isViewer,
    played: record.won + record.drawn + record.lost,
    ...record,
    points: record.won * 3 + record.drawn,
    gamesDifference: 0,
    isWinner: position === 1,
  };
}

/** One Pool of five, the viewer's team fifth. */
function singlePool(game: TournamentFixture): TournamentFixture {
  const viewerTeam = game.gameTeams.find((team) =>
    team.members.some((member) => member.id === game.viewerUserId),
  )!;
  const others = game.gameTeams
    .filter((team) => team.id !== viewerTeam.id)
    .slice(0, 4);
  const teams = [...others, viewerTeam];
  const records = [
    { won: 4, drawn: 0, lost: 0 },
    { won: 3, drawn: 0, lost: 1 },
    { won: 2, drawn: 0, lost: 2 },
    { won: 1, drawn: 0, lost: 3 },
    { won: 0, drawn: 0, lost: 4 },
  ];
  const pool: ComputedPoolTable = {
    poolIndex: 0,
    label: "group A",
    finished: true,
    winnerGameTeamId: teams[0]!.id,
    rows: teams.map((team, index) =>
      row(index + 1, team.id, records[index]!, team.id === viewerTeam.id),
    ),
    viewerRounds: [],
    matches: [],
  };
  return {
    ...game,
    gameTeams: teams.map((team) => ({ ...team, poolIndex: 0 })),
    poolTables: { finished: true, viewerPoolIndex: 0, pools: [pool] },
  };
}

describe("isTournamentFinished", () => {
  it("is over once every Pool Match is settled", () => {
    expect(isTournamentFinished(pools.finished)).toBe(true);
    expect(isTournamentFinished(pools.postedMid)).toBe(false);
    expect(isTournamentFinished(pools.preDrawWithoutSeat)).toBe(false);
  });

  it("is over once the Final has a winner", () => {
    expect(isTournamentFinished(knockouts.knockoutOnlyChampion)).toBe(true);
    expect(isTournamentFinished(knockouts.knockoutOnlyMid)).toBe(false);
    expect(isTournamentFinished(knockouts.groupsThenKnockout)).toBe(false);
  });

  it("never finishes a cancelled day", () => {
    expect(isTournamentFinished({ ...pools.finished, cancelledAt: NOW })).toBe(
      false,
    );
  });
});

describe("tournamentFinishedView", () => {
  it("is null until the day is over", () => {
    expect(tournamentFinishedView(pools.postedMid, "en")).toBeNull();
  });

  it("names the day, where and how big", () => {
    const view = tournamentFinishedView(pools.finished, "en")!;
    expect(view.dateLine).toBe("Finished, Sunday 8 November");
    expect(view.summary).toBe("Padelhuset Bromma. 12 teams, 3 Rounds, Bromma");
    expect(view.share).toEqual({ kind: "placing", label: "Share your day" });
  });

  it("puts each Pool's winner on top when there is more than one Pool", () => {
    const view = tournamentFinishedView(pools.finished, "en")!;
    expect(view.podium.map((entry) => entry.smallLine)).toEqual([
      "You & Sam C",
      "Won Group B",
      "Won Group C",
    ]);
    expect(view.podium[0]).toMatchObject({
      place: 1,
      pool: "Group A",
      isViewer: true,
      mainLine: "Won Group A",
      detailLine: "3–0–0, 9 points",
      results: ["won", "won", "won"],
      resultsLabel: "Your results: Won, Won, Won",
    });
    expect(view.viewerDay).toEqual({
      matchCount: 3,
      gamesFor: 18,
      gamesAgainst: 12,
      poolWinnerGameTeamId: "game-team-01",
    });
  });

  it("shows the top three of one Pool, then the viewer's own line", () => {
    const view = tournamentFinishedView(singlePool(pools.finished), "en")!;
    expect(
      view.podium.map((entry) => [
        entry.place,
        entry.smallLine,
        entry.detailLine,
      ]),
    ).toEqual([
      [1, "Won the day", "4–0–0, 12 points"],
      [2, "Second", "3–0–1, 9 points"],
      [3, "Third", "2–0–2, 6 points"],
      [5, "You & Sam C", "0–0–4, 0 points, 12 points behind"],
    ]);
    expect(view.podium[3]!.mainLine).toBe("Fifth, 0 points");
  });

  it("puts the Champion and the runner-up on top of a knockout", () => {
    const view = tournamentFinishedView(knockouts.knockoutOnlyChampion, "en")!;
    expect(view.summary).toBe("Padelhuset Bromma. 6 teams, Bromma");
    expect(
      view.podium.map((entry) => [
        entry.smallLine,
        entry.mainLine,
        entry.detailLine,
      ]),
    ).toEqual([
      ["You & Sam C", "Champion", "Won the Final"],
      ["Runner-up", "Hana W & Leo G", null],
    ]);
  });

  it("adds the round a knocked-out viewer went out in, with their results", () => {
    const view = tournamentFinishedView(
      viewing(knockouts.knockoutOnlyChampion, "p07"),
      "en",
    )!;
    expect(view.podium.at(-1)).toMatchObject({
      place: null,
      isViewer: true,
      mainLine: "Out in the Semi-finals",
      results: ["won", "lost"],
    });
    expect(view.share).toEqual({
      kind: "table",
      label: "Share the final table",
    });
  });

  it("asks someone without a team to share the final table", () => {
    const view = tournamentFinishedView(
      viewing(pools.finished, "someone-else"),
      "en",
    )!;
    expect(view.share.kind).toBe("table");
    expect(view.viewerDay).toBeNull();
    expect(view.podium.every((entry) => !entry.isViewer)).toBe(true);
  });

  it("asks an Organizer who played to share the final table", () => {
    const view = tournamentFinishedView(
      { ...pools.finished, isOrganizer: true },
      "en",
    )!;
    expect(view.share).toEqual({
      kind: "table",
      label: "Share the final table",
    });
  });
});

describe("tournamentShareCard", () => {
  it("shares the viewer's placing and record", () => {
    expect(tournamentShareCard(pools.finished, "en")).toMatchObject({
      kind: "placing",
      eyebrow: "Bromma Autumn Friendly, 8 Nov. Padelhuset Bromma",
      placing: "1st",
      placingNote: "in Group A",
      team: "Alex Rivera & Sam Chen",
      record: "3 won, 0 drawn, 0 lost. 9 points",
      results: ["won", "won", "won"],
      imageLabel: "Result card: 1st in Group A, Alex Rivera & Sam Chen",
    });
  });

  it("says how many teams the viewer finished among in one Pool", () => {
    expect(tournamentShareCard(singlePool(pools.finished), "en")).toMatchObject(
      { kind: "placing", placing: "5th", placingNote: "of 5 teams" },
    );
  });

  it("calls the knockout winner the Champion", () => {
    expect(
      tournamentShareCard(knockouts.knockoutOnlyChampion, "en"),
    ).toMatchObject({
      kind: "placing",
      placing: "1st",
      placingNote: "Champion",
      record: null,
      results: ["won", "won"],
    });
  });

  it("shares the Final, not the Champion's card, for a knocked-out viewer", () => {
    const card = tournamentShareCard(
      viewing(knockouts.knockoutOnlyChampion, "p07"),
      "en",
    );
    expect(card).toMatchObject({ kind: "table", title: "The Final" });
    expect(
      card?.kind === "table" && card.rows.map((entry) => entry.team),
    ).toEqual(["Alex Rivera & Sam Chen", "Hana W & Leo G"]);
  });

  it("shares the whole table of one Pool for an Organizer", () => {
    const card = tournamentShareCard(
      { ...singlePool(pools.finished), isOrganizer: true },
      "en",
    );
    expect(card?.kind).toBe("table");
    if (card?.kind !== "table") {
      return;
    }
    expect(card.title).toBe("Final table");
    expect(card.rows.map((entry) => [entry.place, entry.points])).toEqual([
      ["1", "12 pts"],
      ["2", "9 pts"],
      ["3", "6 pts"],
      ["4", "3 pts"],
      ["5", "0 pts"],
    ]);
    expect(card.message.split("\n")[0]).toBe(
      "Bromma Autumn Friendly, Final table",
    );
  });

  it("shares each Pool's winner when there are several", () => {
    const card = tournamentShareCard(
      viewing(pools.finished, "someone-else"),
      "en",
    );
    expect(card).toMatchObject({ kind: "table", title: "Group winners" });
    expect(
      card?.kind === "table" && card.rows.map((entry) => entry.place),
    ).toEqual(["A", "B", "C"]);
  });

  it("is null until the day is over", () => {
    expect(tournamentShareCard(pools.postedMid, "en")).toBeNull();
  });
});

describe("confirmedMatchCount", () => {
  it("counts only agreed scores", () => {
    expect(
      confirmedMatchCount([
        { matches: [{ state: "confirmed" }, { state: "on_court" }] },
        { matches: [{ state: "confirmed" }, { state: "not_finished" }] },
      ]),
    ).toBe(2);
  });
});
