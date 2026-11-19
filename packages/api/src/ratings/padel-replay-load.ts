import {
  and,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  or,
  type SQLWrapper,
} from "drizzle-orm";

import {
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  GroupSportEnum,
  kingPlaceAwards,
  levelOverrides,
  matches,
  ratingEvents,
  ratings,
  user,
  type DbTx,
} from "@repo/db";

import type {
  PadelLedger,
  ReplayKingGame,
  ReplayMatch,
} from "#src/ratings/padel-replay";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

const PADEL = GroupSportEnum.PADEL;

export type UpcomingLevelRangeSeat = {
  gameId: string;
  userId: string;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
};

function padelMatchIds(tx: DbTx) {
  return tx
    .selectDistinct({ id: ratingEvents.matchId })
    .from(ratingEvents)
    .where(eq(ratingEvents.sport, PADEL));
}

function padelRatings(tx: DbTx) {
  return tx
    .select({
      userId: ratings.userId,
      sport: ratings.sport,
      mu: ratings.mu,
      phi: ratings.phi,
      sigma: ratings.sigma,
      levelBand: ratings.levelBand,
      declaredBand: ratings.declaredBand,
      selfDeclaredAt: ratings.selfDeclaredAt,
      lastRatedAt: ratings.lastRatedAt,
      createdAt: ratings.createdAt,
    })
    .from(ratings)
    .where(eq(ratings.sport, PADEL));
}

function padelEvents(tx: DbTx) {
  return tx
    .select({
      id: ratingEvents.id,
      userId: ratingEvents.userId,
      sport: ratingEvents.sport,
      matchId: ratingEvents.matchId,
      outcomeScore: ratingEvents.outcomeScore,
      weight: ratingEvents.weight,
      muBefore: ratingEvents.muBefore,
      phiBefore: ratingEvents.phiBefore,
      sigmaBefore: ratingEvents.sigmaBefore,
      muAfter: ratingEvents.muAfter,
      phiAfter: ratingEvents.phiAfter,
      sigmaAfter: ratingEvents.sigmaAfter,
      levelBandBefore: ratingEvents.levelBandBefore,
      lastRatedAtBefore: ratingEvents.lastRatedAtBefore,
      reliabilityPart: ratingEvents.reliabilityPart,
      proveItPart: ratingEvents.proveItPart,
      reliabilityLossFactor: ratingEvents.reliabilityLossFactor,
      createdAt: ratingEvents.createdAt,
    })
    .from(ratingEvents)
    .where(eq(ratingEvents.sport, PADEL));
}

function padelOverrides(tx: DbTx) {
  return tx
    .select({
      id: levelOverrides.id,
      userId: levelOverrides.userId,
      sport: levelOverrides.sport,
      muBefore: levelOverrides.muBefore,
      phiBefore: levelOverrides.phiBefore,
      sigmaBefore: levelOverrides.sigmaBefore,
      levelBandBefore: levelOverrides.levelBandBefore,
      muAfter: levelOverrides.muAfter,
      phiAfter: levelOverrides.phiAfter,
      sigmaAfter: levelOverrides.sigmaAfter,
      levelBandAfter: levelOverrides.levelBandAfter,
      createdAt: levelOverrides.createdAt,
    })
    .from(levelOverrides)
    .where(eq(levelOverrides.sport, PADEL));
}

function padelAwards(tx: DbTx) {
  return tx
    .select({
      id: kingPlaceAwards.id,
      userId: kingPlaceAwards.userId,
      sport: kingPlaceAwards.sport,
      gameId: kingPlaceAwards.gameId,
      finalPlace: kingPlaceAwards.finalPlace,
      wins: kingPlaceAwards.wins,
      fieldMu: kingPlaceAwards.fieldMu,
      fieldPhi: kingPlaceAwards.fieldPhi,
      muBefore: kingPlaceAwards.muBefore,
      phiBefore: kingPlaceAwards.phiBefore,
      sigmaBefore: kingPlaceAwards.sigmaBefore,
      muAfter: kingPlaceAwards.muAfter,
      phiAfter: kingPlaceAwards.phiAfter,
      sigmaAfter: kingPlaceAwards.sigmaAfter,
      levelBandBefore: kingPlaceAwards.levelBandBefore,
      lastRatedAtBefore: kingPlaceAwards.lastRatedAtBefore,
      createdAt: kingPlaceAwards.createdAt,
    })
    .from(kingPlaceAwards)
    .where(eq(kingPlaceAwards.sport, PADEL));
}

function ratedMatches(tx: DbTx, matchIds: SQLWrapper) {
  return tx
    .select({
      id: matches.id,
      groupId: games.groupId,
      slot1GameTeamId: matches.slot1GameTeamId,
      slot2GameTeamId: matches.slot2GameTeamId,
    })
    .from(matches)
    .innerJoin(games, eq(games.id, matches.gameId))
    .where(inArray(matches.id, matchIds));
}

/**
 * The same read as `applyRatedMatch`'s, so each side's players come back in
 * the order the live writer saw them.
 */
function matchTeamPlayers(tx: DbTx, matchGameIds: SQLWrapper) {
  return tx.query.gameTeamPlayers.findMany({
    where: inArray(
      gameTeamPlayers.gameTeamId,
      tx
        .select({ id: gameTeams.id })
        .from(gameTeams)
        .where(inArray(gameTeams.gameId, matchGameIds)),
    ),
    columns: { gameTeamId: true },
    with: { gamePlayer: { columns: { userId: true } } },
  });
}

/** The same read as `applyKingPlaceAwards`'s, for the same reason. */
function kingGameTeams(tx: DbTx, kingGameIds: SQLWrapper) {
  return tx.query.gameTeams.findMany({
    where: inArray(gameTeams.gameId, kingGameIds),
    columns: { gameId: true, startCourt: true, finalPlace: true },
    with: {
      players: { with: { gamePlayer: { columns: { userId: true } } } },
    },
  });
}

/** Every player with a padel Rating or a seat on one of those Games. */
function seatedPlayers(
  tx: DbTx,
  matchGameIds: SQLWrapper,
  kingGameIds: SQLWrapper,
) {
  return tx
    .select({
      id: user.id,
      name: user.name,
      guestAt: user.guestAt,
      clerkId: user.clerkId,
      addedAt: user.addedAt,
    })
    .from(user)
    .where(
      or(
        inArray(
          user.id,
          tx
            .select({ id: ratings.userId })
            .from(ratings)
            .where(eq(ratings.sport, PADEL)),
        ),
        inArray(
          user.id,
          tx
            .select({ id: gamePlayers.userId })
            .from(gamePlayers)
            .where(
              or(
                inArray(gamePlayers.gameId, matchGameIds),
                inArray(gamePlayers.gameId, kingGameIds),
              ),
            ),
        ),
      ),
    );
}

function usersByTeam(
  links: Awaited<ReturnType<typeof matchTeamPlayers>>,
): Map<string, string[]> {
  const byTeam = new Map<string, string[]>();
  for (const link of links) {
    const userId = link.gamePlayer.userId;
    if (!userId) {
      continue;
    }
    byTeam.set(link.gameTeamId, [
      ...(byTeam.get(link.gameTeamId) ?? []),
      userId,
    ]);
  }
  return byTeam;
}

function replayMatches(
  rows: Awaited<ReturnType<typeof ratedMatches>>,
  links: Awaited<ReturnType<typeof matchTeamPlayers>>,
): ReplayMatch[] {
  const byTeam = usersByTeam(links);
  const side = (gameTeamId: string | null) =>
    gameTeamId ? (byTeam.get(gameTeamId) ?? []) : null;
  return rows.map((row) => ({
    id: row.id,
    verified: row.groupId != null,
    slot1: side(row.slot1GameTeamId),
    slot2: side(row.slot2GameTeamId),
  }));
}

/** Each King of the court Game's Game teams with a starting court. */
function replayKingGames(
  teams: Awaited<ReturnType<typeof kingGameTeams>>,
): ReplayKingGame[] {
  const teamsByGame = new Map<string, ReplayKingGame["teams"]>();
  for (const team of teams) {
    if (team.startCourt == null) {
      continue;
    }
    teamsByGame.set(team.gameId, [
      ...(teamsByGame.get(team.gameId) ?? []),
      {
        finalPlace: team.finalPlace,
        userIds: [
          ...new Set(
            team.players.flatMap((link) => link.gamePlayer.userId ?? []),
          ),
        ],
      },
    ]);
  }
  return [...teamsByGame].map(([id, gameTeams]) => ({ id, teams: gameTeams }));
}

/**
 * Reads the padel ledger: every padel Rating, rating event, Level override
 * and Place award, each event's Match with its Game teams, each Place award's
 * Game teams, and the players they seat. Never reads a football row.
 */
export async function loadPadelLedger(tx: DbTx): Promise<PadelLedger> {
  const matchIds = padelMatchIds(tx);
  const matchGameIds = tx
    .selectDistinct({ id: matches.gameId })
    .from(matches)
    .where(inArray(matches.id, matchIds));
  const kingGameIds = tx
    .selectDistinct({ id: kingPlaceAwards.gameId })
    .from(kingPlaceAwards)
    .where(eq(kingPlaceAwards.sport, PADEL));

  const [
    ratingRows,
    eventRows,
    overrideRows,
    awardRows,
    matchRows,
    slotLinks,
    kingTeams,
    playerRows,
  ] = await Promise.all([
    padelRatings(tx),
    padelEvents(tx),
    padelOverrides(tx),
    padelAwards(tx),
    ratedMatches(tx, matchIds),
    matchTeamPlayers(tx, matchGameIds),
    kingGameTeams(tx, kingGameIds),
    seatedPlayers(tx, matchGameIds, kingGameIds),
  ]);

  return {
    ratings: ratingRows,
    events: eventRows,
    overrides: overrideRows,
    awards: awardRows,
    matches: replayMatches(matchRows, slotLinks),
    kingGames: replayKingGames(kingTeams),
    players: playerRows.map((row) => ({
      id: row.id,
      name: row.name,
      guest: row.guestAt != null,
      accountHolder: !isUnclaimed(row),
    })),
  };
}

/** Every player seated on an upcoming padel Game that has a Game Level range. */
export async function loadUpcomingLevelRangeSeats(
  tx: DbTx,
  now: Date,
): Promise<UpcomingLevelRangeSeat[]> {
  const rows = await tx
    .select({
      gameId: games.id,
      userId: gamePlayers.userId,
      levelMinTenths: games.levelMinTenths,
      levelMaxTenths: games.levelMaxTenths,
    })
    .from(games)
    .innerJoin(gamePlayers, eq(gamePlayers.gameId, games.id))
    .where(
      and(
        eq(games.sport, PADEL),
        isNull(games.cancelledAt),
        gt(games.windowStart, now),
        isNotNull(gamePlayers.userId),
        or(isNotNull(games.levelMinTenths), isNotNull(games.levelMaxTenths)),
      ),
    );
  return rows.flatMap((row) =>
    row.userId ? [{ ...row, userId: row.userId }] : [],
  );
}
