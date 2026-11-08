import { TRPCError } from "@trpc/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

import {
  CHALLENGE_TIMING_VALUES,
  challengeVenues,
  challenges,
  teamMembers,
  teams,
  WEEKDAY_VALUES,
} from "@repo/db";
import { challengeExpiresAt } from "@repo/domain/challenge-clock";
import {
  CHALLENGE_DEFAULT_DURATION_MINUTES,
  CHALLENGE_MAX_SLOTS,
  CHALLENGE_MAX_VENUES,
  CHALLENGE_NOTE_MAX,
  challengeFormatMessage,
  challengeFormatProblem,
  challengeLevelRangeInverted,
  challengeNoteTooLong,
} from "@repo/domain/challenge-form";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { liveVenuesOfferingSport } from "#src/challenges/venues-for-sport";
import { type db } from "#src/db";
import { isUniqueViolation } from "#src/db/is-unique-violation";
import { enqueueAt } from "#src/jobs/enqueue";
import { challengeExpireJob } from "#src/jobs/specs";
import { notifyRematchNudge } from "#src/notifications/notify-challenge";
import { userActsForTeam } from "#src/teams/acts-for-team";
import { requireTeam } from "#src/teams/helpers/require-team";
import { loadTeamMatches } from "#src/teams/team-record";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

const levelTenths = z
  .number()
  .int()
  .min(LEVEL_TENTHS_MIN)
  .max(LEVEL_TENTHS_MAX)
  .nullable()
  .optional();

export const postChallengeInput = z.object({
  teamId: z.string().uuid(),
  sideSize: z.number().int().nullable().optional(),
  levelMinTenths: levelTenths,
  levelMaxTenths: levelTenths,
  venueIds: z.array(z.string().uuid()).max(CHALLENGE_MAX_VENUES).default([]),
  days: z.array(z.enum(WEEKDAY_VALUES)).default([]),
  timings: z.array(z.enum(CHALLENGE_TIMING_VALUES)).default([]),
  exactSlots: z.array(z.date()).max(CHALLENGE_MAX_SLOTS).default([]),
  note: z.string().max(1000).nullable().optional(),
  nudgeTeamId: z.string().uuid().nullable().optional(),
});

export type PostChallengeInput = z.input<typeof postChallengeInput>;

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

/**
 * A Rematch target: another Team of the same sport that the posting Team has
 * completed at least one Match against.
 */
async function requireNudgeTeam(
  database: DbClient,
  posterTeam: Pick<typeof teams.$inferSelect, "id" | "sport">,
  nudgeTeamId: string,
  m: ReturnType<typeof messagesFor>,
) {
  if (nudgeTeamId === posterTeam.id) {
    refuse(m.challenge.errors.nudgeOwn);
  }
  const nudgeTeam = await database.query.teams.findFirst({
    where: eq(teams.id, nudgeTeamId),
    columns: { id: true, sport: true, createdBy: true, groupId: true },
  });
  if (!nudgeTeam) {
    refuse(m.challenge.errors.nudgeNotPlayed);
  }
  if (nudgeTeam.sport !== posterTeam.sport) {
    refuse(m.challenge.errors.nudgeSport);
  }
  const played = (await loadTeamMatches(database, [posterTeam.id])).get(
    posterTeam.id,
  );
  if (!played?.some((match) => match.opponentTeamId === nudgeTeam.id)) {
    refuse(m.challenge.errors.nudgeNotPlayed);
  }
  return nudgeTeam;
}

/**
 * Post a Challenge for a Team the User acts for: one open at a time, a Format
 * on football that the Roster can field, none on padel and both players, a
 * Level wanted that is not inverted, Venues that offer the sport, and exact
 * slots still ahead. Open for seven days; the expiry job is enqueued now.
 * A Rematch also sends it straight to a Team the poster has played, whose
 * acting Users are told; it still sits on the open board.
 */
export async function postChallenge(
  database: DbClient,
  args: PostChallengeInput & { userId: string; now?: Date; locale?: Locale },
) {
  const input = postChallengeInput.parse(args);
  const now = args.now ?? new Date();
  const locale = args.locale ?? DEFAULT_LOCALE;
  const m = messagesFor(locale);

  const team = await requireTeam(database, input.teamId);
  if (!(await userActsForTeam(database, team, args.userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: m.challenge.errors.notActing,
    });
  }

  const note = input.note?.trim() ?? "";
  if (challengeNoteTooLong(note)) {
    refuse(m.challenge.errors.noteTooLong(CHALLENGE_NOTE_MAX));
  }
  const levelMinTenths = input.levelMinTenths ?? null;
  const levelMaxTenths = input.levelMaxTenths ?? null;
  if (challengeLevelRangeInverted(levelMinTenths, levelMaxTenths)) {
    refuse(m.level.rangeInverted);
  }

  const [roster] = await database
    .select({ count: count() })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, team.id));
  const rosterCount = roster?.count ?? 0;
  const sideSize = input.sideSize ?? null;
  const formatProblem = challengeFormatProblem({
    sport: team.sport,
    sideSize,
    rosterCount,
  });
  if (formatProblem) {
    refuse(
      challengeFormatMessage(formatProblem, { sideSize, rosterCount }, locale),
    );
  }

  const venueIds = [...new Set(input.venueIds)];
  const offering = await liveVenuesOfferingSport(
    database,
    team.sport,
    venueIds,
  );
  if (offering.length !== venueIds.length) {
    refuse(m.challenge.errors.venueSport[team.sport]);
  }
  if (input.exactSlots.some((slot) => slot.getTime() <= now.getTime())) {
    refuse(m.challenge.errors.slotPast);
  }
  const nudgeTeam = input.nudgeTeamId
    ? await requireNudgeTeam(database, team, input.nudgeTeamId, m)
    : null;

  const alreadyOpen = await database.query.challenges.findFirst({
    where: and(eq(challenges.teamId, team.id), eq(challenges.status, "open")),
    columns: { id: true },
  });
  if (alreadyOpen) {
    throw new TRPCError({
      code: "CONFLICT",
      message: m.challenge.errors.alreadyOpen,
    });
  }

  const expiresAt = challengeExpiresAt(now);
  try {
    return await database.transaction(async (tx) => {
      const [created] = await tx
        .insert(challenges)
        .values({
          teamId: team.id,
          sport: team.sport,
          postedBy: args.userId,
          levelMinTenths,
          levelMaxTenths,
          days: [...new Set(input.days)],
          timings: [...new Set(input.timings)],
          exactSlots: input.exactSlots,
          durationMinutes: CHALLENGE_DEFAULT_DURATION_MINUTES[team.sport],
          sideSize,
          note: note.length > 0 ? note : null,
          nudgeTeamId: nudgeTeam?.id ?? null,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: challenges.id });
      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      if (venueIds.length > 0) {
        await tx.insert(challengeVenues).values(
          venueIds.map((venueId, rank) => ({
            challengeId: created.id,
            venueId,
            rank,
          })),
        );
      }
      await enqueueAt(tx, challengeExpireJob(created.id), expiresAt);
      if (nudgeTeam) {
        await notifyRematchNudge(tx, {
          challengeId: created.id,
          nudgedTeam: nudgeTeam,
          posterTeamId: team.id,
          postedBy: args.userId,
        });
      }
      return { id: created.id };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: m.challenge.errors.alreadyOpen,
      });
    }
    throw error;
  }
}

export const postProcedure = protectedProcedure
  .input(postChallengeInput)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return postChallenge(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
