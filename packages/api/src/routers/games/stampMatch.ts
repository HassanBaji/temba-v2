import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, matches, matchVerifierStamps } from "@repo/db";

import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import { knockoutLevelMessage } from "#src/games/knockout-advance";
import { matchVerifierStampOf } from "#src/games/match-result-confirmations";
import {
  runMatchCompletionEffect,
  standUnconfirmedIfConfirmWindowClosed,
} from "#src/games/run-match-completion-effect";
import {
  verifierStampRefusal,
  type VerifierStampRefusal,
} from "#src/games/verifier-stamp";
import { removeJob } from "#src/jobs/enqueue";
import { confirmWindowJobKey, scoreStandsJobKey } from "#src/jobs/specs";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function refusalError(refusal: VerifierStampRefusal, locale: Locale) {
  const m = messagesFor(locale);
  const errors = m.rating.verifier.stamp.errors;
  switch (refusal) {
    case "not_verifier":
      return new TRPCError({ code: "FORBIDDEN", message: errors.notVerifier });
    case "seated":
      return new TRPCError({ code: "FORBIDDEN", message: errors.seated });
    case "cancelled":
      return new TRPCError({ code: "FORBIDDEN", message: errors.cancelled });
    case "completed":
      return new TRPCError({
        code: "BAD_REQUEST",
        message: m.game.errors.matchCompleted,
      });
    case "no_result":
      return new TRPCError({
        code: "FORBIDDEN",
        message: m.game.errors.noResultToConfirm,
      });
    case "knockout_level":
      return new TRPCError({
        code: "FORBIDDEN",
        message: knockoutLevelMessage(locale),
      });
  }
}

/**
 * A Verifier's stamp on a Match at their Venue (ADR-0072): a final
 * confirmation by a neutral party, so the Match completes at once and rates
 * as it would on the players' agreement, at the Game's own weight. The
 * Verifier must not be seated in the Match, and its score must be entered. A
 * Public Game's score whose 24 hours ran out stands without counting, as a
 * late confirmation does (ADR-0071). A repeat by the same Verifier changes
 * nothing.
 */
export async function stampMatch(
  database: DbClient,
  args: { matchId: string; userId: string; locale?: Locale; now?: Date },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const match = await database.query.matches.findFirst({
    where: eq(matches.id, args.matchId),
  });
  if (!match) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.matchNotFound,
    });
  }
  const game = await requireGame(database, match.gameId, locale);

  const refusal = await verifierStampRefusal(database, {
    game,
    match,
    userId: args.userId,
  });
  if (refusal === "completed") {
    const stamp = await matchVerifierStampOf(database, match.id);
    if (stamp?.verifierUserId === args.userId) {
      return { ok: true as const };
    }
  }
  if (refusal) {
    throw refusalError(refusal, locale);
  }
  const venueId = game.venueId;
  if (!venueId) {
    throw refusalError("not_verifier", locale);
  }

  if (
    await standUnconfirmedIfConfirmWindowClosed(database, game, match.id, now)
  ) {
    return { ok: true as const };
  }

  await database.transaction(async (tx) => {
    const [locked] = await tx
      .select({ status: matches.status })
      .from(matches)
      .where(eq(matches.id, match.id))
      .for("update");
    if (locked?.status !== MatchStatusEnum.PENDING) {
      throw refusalError(
        locked?.status === MatchStatusEnum.CANCELLED
          ? "cancelled"
          : "completed",
        locale,
      );
    }
    await tx.insert(matchVerifierStamps).values({
      matchId: match.id,
      verifierUserId: args.userId,
      venueId,
      createdAt: now,
    });
    await runMatchCompletionEffect(tx, game, match.id);
    await removeJob(tx, confirmWindowJobKey(match.id));
    await removeJob(tx, scoreStandsJobKey(match.id));
  });

  return { ok: true as const };
}

export const stampMatchProcedure = protectedProcedure
  .input(z.object({ matchId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return stampMatch(ctx.db, {
      matchId: input.matchId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
