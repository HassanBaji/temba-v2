import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { gameTeamPlayers, matches, user } from "@repo/db";

import {
  COIN_KINDS,
  cabinetKinds,
  isRoast,
  markRelation,
  newestCabinetEntryFirst,
  type CoinKind,
  type MarkRelation,
  type MatchSlot,
  type MvpDecidedBy,
} from "@repo/domain/marks";
import { matchOutcome } from "@repo/domain/match-outcome";
import { outcomeForSlot } from "@repo/domain/match-slots";
import type { Sport } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { loadReceivedCoins, type CabinetGame } from "#src/marks/received-coins";
import {
  matchHistoryHidden,
  mayViewPlayer,
  openableGameIds,
} from "#src/routers/users/playerProfile";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type KindDetailRow = {
  gameId: string;
  matchId: string | null;
  game: CabinetGame;
  playedAt: Date;
  sport: Sport;
  /** Each scored Set, or the football score, from the owner's side. */
  score: { us: number; them: number }[] | null;
  outcome: "won" | "lost" | "draw" | null;
  /** Null for an MVP. */
  giver: { userId: string; name: string; image: string | null } | null;
  /** Null for an MVP, or when the giver or owner has left the roster since. */
  relation: MarkRelation | null;
  /** How an MVP was decided; null for a Mark. */
  decidedBy: MvpDecidedBy | null;
  canOpenGame: boolean;
};

const notFound = (message: string) =>
  new TRPCError({ code: "NOT_FOUND", message });

type MatchSides = {
  sets: { slot1GamesWon: number | null; slot2GamesWon: number | null }[];
  slotOf: (userId: string) => MatchSlot | null;
};

async function matchSides(
  database: DbClient,
  matchIds: readonly string[],
): Promise<Map<string, MatchSides>> {
  if (matchIds.length === 0) {
    return new Map();
  }
  const rows = await database.query.matches.findMany({
    where: inArray(matches.id, [...matchIds]),
    columns: { id: true, slot1GameTeamId: true, slot2GameTeamId: true },
    with: {
      sets: {
        columns: { slot1GamesWon: true, slot2GamesWon: true },
        orderBy: (table, { asc }) => [asc(table.setNumber)],
      },
    },
  });
  const teamIds = rows.flatMap((row) =>
    [row.slot1GameTeamId, row.slot2GameTeamId].filter(
      (id): id is string => id != null,
    ),
  );
  const links =
    teamIds.length === 0
      ? []
      : await database.query.gameTeamPlayers.findMany({
          where: inArray(gameTeamPlayers.gameTeamId, teamIds),
          columns: { gameTeamId: true },
          with: { gamePlayer: { columns: { userId: true } } },
        });
  const teamOf = (userId: string) =>
    new Set(
      links.flatMap((link) =>
        link.gamePlayer.userId === userId ? [link.gameTeamId] : [],
      ),
    );

  return new Map(
    rows.map((row) => [
      row.id,
      {
        sets: row.sets,
        slotOf: (userId: string) => {
          const teams = teamOf(userId);
          if (row.slot1GameTeamId && teams.has(row.slot1GameTeamId)) {
            return 1;
          }
          if (row.slot2GameTeamId && teams.has(row.slot2GameTeamId)) {
            return 2;
          }
          return null;
        },
      },
    ]),
  );
}

function ownerScore(sets: MatchSides["sets"], slot: MatchSlot) {
  const scored = sets.flatMap((set) =>
    set.slot1GamesWon != null && set.slot2GamesWon != null
      ? [
          slot === 1
            ? { us: set.slot1GamesWon, them: set.slot2GamesWon }
            : { us: set.slot2GamesWon, them: set.slot1GamesWon },
        ]
      : [],
  );
  return scored.length > 0 ? scored : null;
}

/**
 * Every Game one kind of coin came from, on one sport's tab, newest first:
 * who gave it and from which side, the score and the result from the owner's
 * side, and whether the viewer may open the Game. Gated like the cabinet; a
 * Roast the owner hides is not found for anyone else.
 */
export async function kindDetail(
  database: DbClient,
  args: {
    viewerId: string;
    playerId: string;
    kind: CoinKind;
    sport: Sport;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  if (!(await mayViewPlayer(database, args))) {
    throw notFound(messagesFor(locale).profile.errors.playerNotFound);
  }
  const owner = await database.query.user.findFirst({
    where: eq(user.id, args.playerId),
    columns: { id: true, hideRoasts: true, matchHistoryVisibility: true },
  });
  if (!owner) {
    throw notFound(messagesFor(locale).profile.errors.playerNotFound);
  }
  const isOwner = owner.id === args.viewerId;
  const hiddenRoast = owner.hideRoasts && isRoast(args.kind);
  if (
    (hiddenRoast && !isOwner) ||
    !cabinetKinds(args.sport).includes(args.kind) ||
    (await matchHistoryHidden(database, {
      viewerId: args.viewerId,
      playerId: owner.id,
      visibility: owner.matchHistoryVisibility,
    }))
  ) {
    throw notFound(messagesFor(locale).marks.errors.markNotFound);
  }

  const coins = (
    await loadReceivedCoins(database, { userId: owner.id, kind: args.kind })
  )
    .filter((coin) => coin.sport === args.sport)
    .sort(newestCabinetEntryFirst);
  const [sides, openable] = await Promise.all([
    matchSides(database, [
      ...new Set(coins.flatMap((coin) => (coin.matchId ? [coin.matchId] : []))),
    ]),
    openableGameIds(database, args.viewerId, [
      ...new Set(coins.map((coin) => coin.gameId)),
    ]),
  ]);

  const rows: KindDetailRow[] = coins.map((coin) => {
    const match = coin.matchId ? sides.get(coin.matchId) : undefined;
    const ownerSlot = match?.slotOf(owner.id) ?? null;
    const giverSlot =
      coin.giver && match ? match.slotOf(coin.giver.userId) : null;
    return {
      gameId: coin.gameId,
      matchId: coin.matchId,
      game: coin.game,
      playedAt: coin.playedAt,
      sport: coin.sport,
      score: match && ownerSlot ? ownerScore(match.sets, ownerSlot) : null,
      outcome:
        match && ownerSlot
          ? outcomeForSlot(ownerSlot, matchOutcome(match.sets).result)
          : null,
      giver: coin.giver,
      relation:
        ownerSlot && giverSlot ? markRelation(giverSlot, ownerSlot) : null,
      decidedBy: coin.decidedBy,
      canOpenGame: openable.has(coin.gameId),
    };
  });

  return {
    kind: args.kind,
    sport: args.sport,
    isOwner,
    hiddenFromOthers: isOwner && hiddenRoast,
    rows,
  };
}

export const kindDetailProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.string().uuid(),
      kind: z.enum(COIN_KINDS),
      sport: sportSchema,
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return kindDetail(ctx.db, {
      viewerId: appUser.id,
      playerId: input.userId,
      kind: input.kind,
      sport: input.sport,
      locale: ctx.locale,
    });
  });
