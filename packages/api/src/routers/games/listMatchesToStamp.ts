import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import {
  MatchStatusEnum,
  games,
  matchSets,
  matches,
  venueVerifiers,
  venues,
} from "@repo/db";

import { gameDisplayName } from "@repo/domain/game-custom-name";
import { sportOrDefault, type Sport } from "@repo/domain/sport";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { mayStampNow } from "#src/games/verifier-stamp";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const CANDIDATE_LIMIT = 40;

export type MatchToStamp = {
  matchId: string;
  gameId: string;
  gameName: string;
  sport: Sport;
  venueName: string;
  startsAt: Date | null;
};

/**
 * The Matches a Verifier may stamp now (ADR-0072): pending Matches with a
 * score entered, in live Games at the Venues where they hold the role, that
 * they are not seated in. Newest first. Empty for a User who is no Verifier.
 */
export async function listMatchesToStamp(
  database: DbClient,
  args: { userId: string; now?: Date; locale?: Locale },
): Promise<MatchToStamp[]> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const grants = await database
    .select({ venueId: venueVerifiers.venueId })
    .from(venueVerifiers)
    .where(eq(venueVerifiers.userId, args.userId));
  if (grants.length === 0) {
    return [];
  }

  const scored = database
    .selectDistinct({ matchId: matchSets.matchId })
    .from(matchSets)
    .where(
      and(
        isNotNull(matchSets.slot1GamesWon),
        isNotNull(matchSets.slot2GamesWon),
      ),
    );
  const candidates = await database
    .select({ match: matches, game: games, venueName: venues.name })
    .from(matches)
    .innerJoin(games, eq(games.id, matches.gameId))
    .innerJoin(venues, eq(venues.id, games.venueId))
    .where(
      and(
        inArray(
          games.venueId,
          grants.map((grant) => grant.venueId),
        ),
        isNull(games.cancelledAt),
        eq(matches.status, MatchStatusEnum.PENDING),
        inArray(matches.id, scored),
      ),
    )
    .orderBy(desc(games.windowStart), desc(matches.createdAt))
    .limit(CANDIDATE_LIMIT);

  const rows: MatchToStamp[] = [];
  for (const { match, game, venueName } of candidates) {
    if (
      await mayStampNow(database, { game, match, userId: args.userId, now })
    ) {
      rows.push({
        matchId: match.id,
        gameId: game.id,
        gameName: gameDisplayName(game, locale),
        sport: sportOrDefault(game.sport),
        venueName,
        startsAt: match.startTime ?? game.windowStart,
      });
    }
  }
  return rows;
}

export const listMatchesToStampProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listMatchesToStamp(ctx.db, {
      userId: appUser.id,
      locale: ctx.locale,
    });
  },
);
