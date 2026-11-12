import { describe, expect, it } from "vitest";

import type { ComputedPoolTable, PoolTableRow } from "./pool-table";
import {
  createKnockoutTournamentFixtures,
  createTournamentFixtures,
  type TournamentFixture,
} from "./tournament-details-fixtures";
import {
  isTournamentFinished,
  tournamentFinishedView,
  tournamentShareCard,
} from "./tournament-finished";

const NOW = new Date("2026-11-08T08:00:00Z");
const pools = createTournamentFixtures(NOW);
const knockouts = createKnockoutTournamentFixtures(NOW);

function row(
  position: number,
  gameTeamId: string,
  record: { won: number; drawn: number; lost: number },
  isViewer = false,
): PoolTableRow {
  const points = record.won * 3 + record.drawn;
  return {
    position,
    gameTeamId,
    name: gameTeamId,
    isViewer,
    played: record.won + record.drawn + record.lost,
    ...record,
    points,
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
    expect(view.shareLabel).toBe("Share your day");
  });

  it("puts each Pool's winner on top when there is more than one Pool", () => {
    const view = tournamentFinishedView(pools.finished, "en")!;
    expect(view.podium.map((entry) => entry.eyebrow)).toEqual([
      "You & Sam C",
      "Won Group B",
      "Won Group C",
    ]);
    expect(view.podium[0]).toMatchObject({
      isViewer: true,
      title: "Won Group A",
      meta: "3–0–0, 9 points",
      results: ["won", "won", "won"],
      resultsLabel: "Your results: Won, Won, Won",
    });
    expect(view.viewerGames).toEqual({ count: 3, scored: 18, conceded: 12 });
  });

  it("shows the top three of one Pool, then the viewer's own line", () => {
    const view = tournamentFinishedView(singlePool(pools.finished), "en")!;
    expect(
      view.podium.map((entry) => [entry.place, entry.eyebrow, entry.meta]),
    ).toEqual([
      [1, "Won the day", "4–0–0, 12 points"],
      [2, "Second", "3–0–1, 9 points"],
      [3, "Third", "2–0–2, 6 points"],
      [5, "You & Sam C", "0–0–4, 0 points, 12 points behind"],
    ]);
    expect(view.podium[3]!.title).toBe("Fifth, 0 points");
    expect(view.podium[0]!.title).not.toContain("You");
  });

  it("puts the champion and the runner-up on top of a knockout", () => {
    const view = tournamentFinishedView(knockouts.knockoutOnlyChampion, "en")!;
    expect(view.summary).toBe("Padelhuset Bromma. 6 teams, Bromma");
    expect(
      view.podium.map((entry) => [entry.eyebrow, entry.title, entry.meta]),
    ).toEqual([
      ["You & Sam C", "Won the day", "Won the final"],
      ["Runner-up", "Hana W & Leo G", null],
    ]);
  });

  it("asks someone without a team to share the final table", () => {
    const organizer = {
      ...pools.finished,
      viewerUserId: "someone-else",
      poolTables: pools.finished.poolTables && {
        ...pools.finished.poolTables,
        viewerPoolIndex: null,
        pools: pools.finished.poolTables.pools.map((pool) => ({
          ...pool,
          rows: pool.rows.map((entry) => ({ ...entry, isViewer: false })),
        })),
      },
    };
    const view = tournamentFinishedView(organizer, "en")!;
    expect(view.shareLabel).toBe("Share the final table");
    expect(view.viewerGames).toBeNull();
    expect(view.podium.every((entry) => !entry.isViewer)).toBe(true);
  });
});

describe("tournamentShareCard", () => {
  it("shares the viewer's placing and record", () => {
    expect(tournamentShareCard(pools.finished, "en")).toMatchObject({
      eyebrow: "Bromma Autumn Friendly, 8 Nov. Padelhuset Bromma",
      placing: "1st",
      placingNote: "in Group A",
      team: "Alex Rivera & Sam Chen",
      record: "3 won, 0 drawn, 0 lost. 9 points",
      results: ["won", "won", "won"],
    });
  });

  it("says how many teams the viewer finished among in one Pool", () => {
    expect(tournamentShareCard(singlePool(pools.finished), "en")).toMatchObject(
      { placing: "5th", placingNote: "of 5 teams" },
    );
  });

  it("says the champion won the day", () => {
    expect(
      tournamentShareCard(knockouts.knockoutOnlyChampion, "en"),
    ).toMatchObject({
      placing: "1st",
      placingNote: "won the day",
      record: null,
    });
  });

  it("is null until the day is over", () => {
    expect(tournamentShareCard(pools.postedMid, "en")).toBeNull();
  });
});
