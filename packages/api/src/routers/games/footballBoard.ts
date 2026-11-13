import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  groups,
  matchGoals,
  matchResultConfirmations,
  ratings,
} from "@repo/db";

import {
  DEFAULT_FOOTBALL_BIBS,
  footballBalanceStrength,
  type FootballBalanceOn,
  type FootballBib,
} from "@repo/domain/football-lineup";
import { ovrBalanceStrength, wholeOvrFromMu } from "@repo/domain/football-ovr";
import { groupHasTier } from "@repo/domain/game-rating-scope";
import type { GroupMemberTierData } from "@repo/domain/group-data";
import { type LevelBand } from "@repo/domain/level-bands";
import { TIER_POINTS_START } from "@repo/domain/tier-points";
import { squadsReadyForScore } from "@repo/domain/matchday-squad";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame } from "#src/games/access";
import { gameReach } from "#src/games/verifier-stamp";
import { confirmsAsOrganizer } from "#src/games/confirms-as-organizer";
import { loadChallengeSides } from "#src/games/challenge-squad";
import { groupIsVerified } from "#src/groups/group-is-verified";
import {
  loadGroupTierTable,
  tierPointsShownTo,
} from "#src/ratings/group-tier-table";
import { tierStartHints } from "#src/ratings/tier-start-hints";
import {
  assertFootballGame,
  footballMatch,
  footballScoreOf,
  footballScoreOpen,
  footballScoreSet,
  footballSides,
} from "#src/games/football-lineup";
import {
  matchOrganizerSides,
  matchSlotsActedFor,
  matchSlotsConfirmed,
} from "#src/games/match-result-confirmations";
import { guestStandInBand } from "@repo/domain/guest-player";
import { gameMemberNicknames } from "#src/groups/helpers/game-member-nicknames";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";
import { maskPhone } from "#src/unclaimed-players/mask-phone";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type BoardLevel = { levelBand: LevelBand; mu: number };

/**
 * The Level a Guest player shows and balances at: the mean of the Users with
 * an account in the Game (ADR-0079). Null when none of them has a Level.
 */
function guestStandInLevel(
  levels: readonly (BoardLevel | null)[],
): BoardLevel | null {
  const known = levels.filter((level): level is BoardLevel => level !== null);
  const levelBand = guestStandInBand(known.map((level) => level.levelBand));
  if (!levelBand) {
    return null;
  }
  return {
    levelBand,
    mu: known.reduce((sum, level) => sum + level.mu, 0) / known.length,
  };
}

async function sideIndexByUser(
  database: DbClient,
  sides: Awaited<ReturnType<typeof footballSides>>,
) {
  const bySide = new Map<string, 1 | 2>();
  for (const [sideIndex, side] of [
    [1, sides.slot1],
    [2, sides.slot2],
  ] as const) {
    if (!side) {
      continue;
    }
    const links = await database.query.gameTeamPlayers.findMany({
      where: eq(gameTeamPlayers.gameTeamId, side.id),
      columns: {},
      with: { gamePlayer: { columns: { userId: true } } },
    });
    for (const link of links) {
      if (link.gamePlayer.userId) {
        bySide.set(link.gamePlayer.userId, sideIndex);
      }
    }
  }
  return bySide;
}

type BoardTier = {
  tier: GroupMemberTierData | null;
  balanceStrength: number;
};

/**
 * Each roster player's Group Tier on a tier Group's Game, and what Make teams
 * balances them on: their Tier points, or while Provisional the start
 * hint their Temba Level gives against the Group's ranked members. Null
 * outside a tier Group. A Provisional member's points are shown only to the
 * viewer themselves and to an Organizer.
 */
async function loadBoardTiers(
  database: DbClient,
  args: {
    groupId: string | null;
    rosterUserIds: readonly string[];
    viewerUserId: string;
    viewerOrganizes: boolean;
  },
): Promise<Map<string, BoardTier> | null> {
  if (!args.groupId) {
    return null;
  }
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, args.groupId),
    columns: { id: true, sport: true, verifiedAt: true, venueId: true },
  });
  if (
    !group ||
    !groupHasTier({ sport: group.sport, verified: groupIsVerified(group) })
  ) {
    return null;
  }
  const { table, rowByUser } = await loadGroupTierTable(database, group.id);

  const startHint = await tierStartHints(database, {
    groupId: group.id,
    rowByUser,
    userIds: args.rosterUserIds,
  });

  const viewer = {
    userId: args.viewerUserId,
    organizes: args.viewerOrganizes,
  };
  const tableRowByUser = new Map(table.rows.map((row) => [row.userId, row]));
  const byUser = new Map<string, BoardTier>();
  for (const userId of args.rosterUserIds) {
    const row = tableRowByUser.get(userId);
    const provisional = row?.provisional ?? true;
    byUser.set(userId, {
      tier: row
        ? {
            band: row.band,
            place: row.place,
            points: tierPointsShownTo(row, viewer),
            provisional: row.provisional,
            gamesOfFive: row.gamesOfFive,
            gamesCounted: row.gamesCounted,
          }
        : null,
      balanceStrength:
        footballBalanceStrength({
          tierPoints: row?.points ?? TIER_POINTS_START,
          tierProvisional: provisional,
          ovrHint: startHint(userId),
        }) ?? TIER_POINTS_START,
    });
  }
  return byUser;
}

/**
 * Everything the football Game screens read beyond `games.byId`: the roster
 * with each player's role, position, Level and OVR, Group Tier and team, the
 * two teams and their bibs, the Score with its scorers, and what the viewer
 * may do next. Make teams balances on Tier points in a tier Group and on OVR
 * on any other Game.
 */
export async function footballBoard(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
  now: Date = new Date(),
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  const reach = await gameReach(database, game, args.userId);
  if (!reach) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  }
  assertFootballGame(game, locale);

  const organizer = await isGameOrganizer(database, game, args.userId);
  const roster = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, game.id),
    columns: {
      userId: true,
      footballRole: true,
      footballPosition: true,
      createdAt: true,
    },
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
          clerkId: true,
          addedAt: true,
          phoneNumber: true,
          guestAt: true,
        },
      },
    },
    orderBy: asc(gamePlayers.createdAt),
  });
  const userIds = roster.flatMap((row) => (row.user ? [row.user.id] : []));

  const levelByUser = new Map<string, BoardLevel>();
  if (userIds.length > 0) {
    const rows = await database.query.ratings.findMany({
      where: and(
        inArray(ratings.userId, userIds),
        eq(ratings.sport, "football"),
      ),
      columns: { userId: true, levelBand: true, mu: true },
    });
    for (const row of rows) {
      levelByUser.set(row.userId, { levelBand: row.levelBand, mu: row.mu });
    }
  }

  const guestIds = new Set(
    roster.flatMap((row) =>
      row.user && row.user.guestAt !== null ? [row.user.id] : [],
    ),
  );
  const guestLevel = guestStandInLevel(
    roster.flatMap((row) =>
      row.user?.guestAt === null ? [levelByUser.get(row.user.id) ?? null] : [],
    ),
  );
  const levelOf = (userId: string) =>
    guestIds.has(userId) ? guestLevel : levelByUser.get(userId);
  const nicknameByUser = await gameMemberNicknames(database, game, args.userId);

  // Group Tier is the Group's own; a Verifier who opens the Game only to
  // stamp it reads the teams and the Score (ADR-0072).
  const tierByUser =
    reach === "stamp_only"
      ? null
      : await loadBoardTiers(database, {
          groupId: game.groupId,
          rosterUserIds: userIds,
          viewerUserId: args.userId,
          viewerOrganizes: organizer,
        });

  const balanceOn: FootballBalanceOn = tierByUser ? "tierPoints" : "ovr";
  const balanceStrengthOf = (userId: string) => {
    if (!organizer) {
      return null;
    }
    if (tierByUser) {
      return tierByUser.get(userId)?.balanceStrength ?? null;
    }
    return ovrBalanceStrength(levelOf(userId)?.mu);
  };

  const sides = await footballSides(database, game.id);
  const sideByUser = await sideIndexByUser(database, sides);
  const match = await footballMatch(database, game.id);
  const score = match
    ? footballScoreOf(await footballScoreSet(database, match.id))
    : null;
  const goals = match
    ? await database.query.matchGoals.findMany({
        where: eq(matchGoals.matchId, match.id),
        columns: { userId: true, goals: true },
      })
    : [];
  const goalsByUser = new Map(goals.map((row) => [row.userId, row.goals]));
  const confirmations = match
    ? await database.query.matchResultConfirmations.findMany({
        where: eq(matchResultConfirmations.matchId, match.id),
        columns: { userId: true, confirmedAt: true },
        with: { user: { columns: { name: true } } },
        orderBy: asc(matchResultConfirmations.confirmedAt),
      })
    : [];
  const slotsConfirmed = match
    ? await matchSlotsConfirmed(database, match)
    : { slot1: false, slot2: false };
  const organizerSides = match
    ? await matchOrganizerSides(database, match)
    : [];

  const viewerSide = sideByUser.get(args.userId) ?? null;
  const confirmsFinal =
    organizer && (await confirmsAsOrganizer(database, game, args.userId));
  const viewerActsFor =
    match && !confirmsFinal && viewerSide == null
      ? await matchSlotsActedFor(database, match, args.userId)
      : [];
  const viewerSlots = viewerSide != null ? [viewerSide] : viewerActsFor;
  const published = sides.slot1 != null && sides.slot2 != null && match != null;
  const challengeSides = await loadChallengeSides(database, game);
  const squadsReady =
    !challengeSides ||
    squadsReadyForScore(challengeSides.map((side) => side.squadState));
  const completed = match?.status === MatchStatusEnum.COMPLETED;
  const live = !game.cancelledAt && !completed;
  const viewerConfirmed = confirmations.some(
    (row) => row.userId === args.userId,
  );
  const viewerSidesConfirmed = viewerSlots.every((slot) =>
    slot === 1 ? slotsConfirmed.slot1 : slotsConfirmed.slot2,
  );
  const bib = (side: { bib: FootballBib | null } | null, index: 1 | 2) =>
    side?.bib ??
    (index === 1 ? DEFAULT_FOOTBALL_BIBS.slot1 : DEFAULT_FOOTBALL_BIBS.slot2);

  return {
    gameId: game.id,
    sideSize: game.sideSize,
    playersAllowed: game.playersAllowed,
    isOrganizer: organizer,
    balanceOn,
    players: roster.flatMap((row) => {
      if (!row.user) {
        return [];
      }
      const guest = guestIds.has(row.user.id);
      const unclaimed = isUnclaimed(row.user) && !guest;
      const level = levelOf(row.user.id);
      return [
        {
          userId: row.user.id,
          name: row.user.name,
          nickname: nicknameByUser.get(row.user.id) ?? null,
          image: row.user.image,
          role: row.footballRole,
          position: row.footballPosition,
          levelBand: level?.levelBand ?? null,
          ovr: level ? wholeOvrFromMu(level.mu) : null,
          balanceStrength: balanceStrengthOf(row.user.id),
          tier: tierByUser?.get(row.user.id)?.tier ?? null,
          sideIndex: sideByUser.get(row.user.id) ?? null,
          goals: goalsByUser.get(row.user.id) ?? 0,
          isViewer: row.user.id === args.userId,
          unclaimed,
          guest,
          phoneMasked:
            organizer && unclaimed && row.user.phoneNumber
              ? maskPhone(row.user.phoneNumber)
              : null,
        },
      ];
    }),
    teams: published
      ? {
          method: game.footballTeamsMethod,
          bibs: { slot1: bib(sides.slot1, 1), slot2: bib(sides.slot2, 2) },
        }
      : null,
    match: match
      ? {
          id: match.id,
          status: match.status,
          score,
          confirmed: slotsConfirmed,
          organizerSides,
          enteredByName: confirmations[0]?.user.name ?? null,
        }
      : null,
    viewer: {
      sideIndex: viewerSide,
      canMakeTeams:
        !challengeSides &&
        organizer &&
        live &&
        score == null &&
        userIds.length >= 2,
      canEnterScore:
        published &&
        squadsReady &&
        live &&
        footballScoreOpen(game, now) &&
        (organizer || viewerSide != null),
      canConfirm:
        live &&
        score != null &&
        viewerSlots.length > 0 &&
        !viewerConfirmed &&
        !viewerSidesConfirmed,
      canConfirmAsOrganizer: confirmsFinal && live && score != null,
      canConfirmForSlots:
        confirmsFinal && live && score != null
          ? organizerSides.flatMap((side) =>
              side.confirmed ? [] : [side.slot],
            )
          : [],
    },
  };
}

export const footballBoardProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return footballBoard(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
