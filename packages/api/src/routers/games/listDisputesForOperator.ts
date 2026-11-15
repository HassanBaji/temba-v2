import { asc, eq } from "drizzle-orm";

import { MatchStatusEnum, matchDisputes } from "@repo/db";

import { isFootballGame } from "@repo/domain/game-shape";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type db } from "#src/db";
import { wrongScoreReversalEligibility } from "#src/games/wrong-score-reversal";
import { operatorProcedure } from "#src/trpc";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const OPERATOR_DISPUTES_LIMIT = 100;

/**
 * Every open Match dispute, oldest first, for an Operator to decide. Each
 * says up front whether upholding can take the Match's moves back: a padel
 * Match a seated player has rated past cannot, and the row carries why.
 */
export async function listDisputesForOperator(
  database: DbClient,
  args: { locale?: Locale } = {},
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const rows = await database.query.matchDisputes.findMany({
    where: eq(matchDisputes.status, "open"),
    orderBy: [asc(matchDisputes.createdAt), asc(matchDisputes.id)],
    limit: OPERATOR_DISPUTES_LIMIT,
    columns: { id: true, note: true, createdAt: true },
    with: {
      raisedBy: { columns: { id: true, name: true, image: true } },
      match: {
        columns: { id: true, status: true, completedAt: true },
        with: {
          game: {
            columns: {
              id: true,
              name: true,
              hasCustomName: true,
              format: true,
              sport: true,
              windowStart: true,
              windowEnd: true,
              challengeId: true,
            },
          },
        },
      },
    },
  });

  return {
    items: await Promise.all(
      rows.map(async (row) => {
        const { game } = row.match;
        const completed = row.match.status === MatchStatusEnum.COMPLETED;
        const clearsScore = game.challengeId != null && isFootballGame(game);
        const eligibility =
          completed && !clearsScore
            ? await wrongScoreReversalEligibility(
                database,
                row.match.id,
                locale,
              )
            : null;
        return {
          id: row.id,
          note: row.note,
          createdAt: row.createdAt,
          raisedBy: row.raisedBy,
          game: {
            id: game.id,
            name: game.name,
            hasCustomName: game.hasCustomName,
            format: game.format,
            sport: game.sport,
            windowStart: game.windowStart,
            windowEnd: game.windowEnd,
          },
          match: {
            id: row.match.id,
            completed,
            completedAt: row.match.completedAt,
          },
          cannotReverseReason:
            eligibility && !eligibility.eligible ? eligibility.reason : null,
        };
      }),
    ),
  };
}

export const listDisputesForOperatorProcedure = operatorProcedure.query(
  async ({ ctx }) => listDisputesForOperator(ctx.db, { locale: ctx.locale }),
);
