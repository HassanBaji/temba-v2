import {
  createTournamentFixtures,
  type TournamentFixture,
} from "./tournament-details-fixtures";

const HOUR_MS = 60 * 60 * 1000;
/** Finishing order by side index: the king first. */
const FINISH_BY_SIDE = [3, 1, 5, 2, 8, 4, 6] as const;

function asKing(fixture: TournamentFixture): TournamentFixture {
  return {
    ...fixture,
    tournamentShape: "king_of_the_court",
    poolCount: null,
    roundCount: null,
    qualifiersPerPool: null,
    matchMinutes: null,
    rated: false,
    ratingScope: "unrated",
    matches: [],
    poolTables: null,
    knockout: null,
    gameTeams: fixture.gameTeams.map((team) => ({
      ...team,
      poolIndex: null,
      knockoutSeed: null,
    })),
  };
}

function drawn(fixture: TournamentFixture): TournamentFixture {
  return {
    ...fixture,
    gameTeams: fixture.gameTeams.map((team, index) => ({
      ...team,
      startCourt: Math.floor(index / 2) + 1,
    })),
  };
}

function placed(fixture: TournamentFixture): TournamentFixture {
  return {
    ...fixture,
    gameTeams: fixture.gameTeams.map((team) => {
      const place = FINISH_BY_SIDE.indexOf(
        (team.sideIndex ?? 0) as (typeof FINISH_BY_SIDE)[number],
      );
      return { ...team, finalPlace: place === -1 ? null : place + 1 };
    }),
  };
}

/**
 * Dev-only King of the court preview data. Fixture records only, from the
 * Pool fixtures with the shape, the starting courts and the final order set.
 */
export function createKingTournamentFixtures(now = new Date()): {
  organizerReadyToDraw: TournamentFixture;
  playerCourts: TournamentFixture;
  organizerFinalOrder: TournamentFixture;
  playerFinished: TournamentFixture;
} {
  const base = createTournamentFixtures(now);
  const started = {
    windowStart: new Date(now.getTime() - 3 * HOUR_MS),
    windowEnd: new Date(now.getTime() - HOUR_MS),
  };
  return {
    organizerReadyToDraw: asKing(base.organizerDraftedDraw),
    playerCourts: drawn(asKing(base.postedMid)),
    organizerFinalOrder: {
      ...drawn(asKing(base.organizerPosted)),
      ...started,
    },
    playerFinished: {
      ...placed(drawn(asKing(base.finished))),
      ...started,
      finalOrderPostedAt: new Date(now.getTime() - HOUR_MS / 2),
    },
  };
}
