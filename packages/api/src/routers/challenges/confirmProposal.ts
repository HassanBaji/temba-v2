import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  challengeProposals,
  challenges,
  games,
  gameTeams,
  matches,
  matchSets,
  teamMembers,
  teams,
  user,
} from "@repo/db";
import type { ChallengeIneligibleReason } from "@repo/domain/challenge-card";
import {
  isChallengeOpen,
  isProposalPending,
} from "@repo/domain/challenge-clock";
import { proposalSlotProblem } from "@repo/domain/challenge-slots";
import { DEFAULT_FOOTBALL_BIBS } from "@repo/domain/football-lineup";
import { sideSizeLabel } from "@repo/domain/game-shape";
import { squadSeatCount } from "@repo/domain/matchday-squad";
import { teamRosterRule } from "@repo/domain/team-roster";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { teamIneligibleReason } from "#src/challenges/challenge-eligibility";
import { lockProposalWithChallenge } from "#src/challenges/lock-proposal";
import { checkProposalTerms } from "#src/challenges/proposal-terms";
import { type db } from "#src/db";
import {
  createFootballGame,
  createFriendlyGame,
} from "#src/games/create-friendly";
import { FOOTBALL_SCORE_SET_NUMBER } from "#src/games/football-lineup";
import { occupySeat, otherPosition } from "#src/games/seats";
import type { SeatChoice } from "#src/games/utils";
import { removeJob } from "#src/jobs/enqueue";
import { scheduleSquadDue } from "#src/jobs/handlers/challenge.squad-due";
import { challengeExpireJobKey, proposalExpireJobKey } from "#src/jobs/specs";
import {
  notifyProposalConfirmed,
  notifyProposalPassedOver,
} from "#src/notifications/notify-challenge";
import { userActsForTeam } from "#src/teams/acts-for-team";
import { teamDisplayName } from "#src/teams/helpers/team-display-name";
import { loadTeamLevels } from "#src/teams/team-level";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;
type Tx = Parameters<Parameters<DbClient["transaction"]>[0]>[0];
type TeamRow = typeof teams.$inferSelect;
type GameRow = typeof games.$inferSelect;

const MS_PER_MINUTE = 60 * 1000;

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

async function rosterOf(tx: Tx, team: TeamRow) {
  const rows = await tx
    .select({
      userId: teamMembers.userId,
      name: user.name,
      preferredPosition: user.preferredPosition,
    })
    .from(teamMembers)
    .innerJoin(user, eq(user.id, teamMembers.userId))
    .where(eq(teamMembers.teamId, team.id))
    .orderBy(teamMembers.createdAt);
  return {
    team,
    members: rows,
    displayName: teamDisplayName(
      team.name,
      rows.map((row) => row.name),
    ),
  };
}

type Roster = Awaited<ReturnType<typeof rosterOf>>;

function recheckMessage(
  reason: ChallengeIneligibleReason,
  roster: Roster,
  sideSize: number | null,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.errors.recheck;
  switch (reason) {
    case "roster_short":
      return m.rosterShort(
        roster.displayName,
        sideSizeLabel(
          sideSize ?? teamRosterRule("football").completeAt,
          locale,
        ),
      );
    case "padel_incomplete":
      return m.padelIncomplete(roster.displayName);
    case "level_outside":
      return m.levelOutside(roster.displayName);
    case "no_level":
      return m.noLevel(roster.displayName);
    case "shares_member":
      return m.sharesMember;
    case "own":
    case "no_team":
      return messagesFor(locale).challenge.errors.notActing;
  }
}

/**
 * Every rule a Proposal was sent under, read again for both Teams: the
 * poster still has the Format's side (padel: both players), and the
 * proposing Team still shares no member, has the side and sits in the Level
 * wanted; the start is still an hour ahead at a Venue with the sport.
 */
async function recheck(
  tx: Tx,
  challenge: typeof challenges.$inferSelect,
  proposal: typeof challengeProposals.$inferSelect,
  poster: Roster,
  proposer: Roster,
  now: Date,
  locale: Locale,
) {
  const posterShort =
    challenge.sport === "padel"
      ? poster.members.length < teamRosterRule("padel").max
      : poster.members.length < (challenge.sideSize ?? 0);
  if (posterShort) {
    refuse(
      recheckMessage(
        challenge.sport === "padel" ? "padel_incomplete" : "roster_short",
        poster,
        challenge.sideSize,
        locale,
      ),
    );
  }
  const levels = await loadTeamLevels(tx, [proposer.team]);
  const reason = teamIneligibleReason(
    challenge,
    new Set(poster.members.map((member) => member.userId)),
    {
      id: proposer.team.id,
      displayName: proposer.displayName,
      sport: proposer.team.sport,
      rosterCount: proposer.members.length,
      memberUserIds: proposer.members.map((member) => member.userId),
      teamLevel: levels.get(proposer.team.id) ?? null,
    },
  );
  if (reason) {
    refuse(recheckMessage(reason, proposer, challenge.sideSize, locale));
  }
  if (proposalSlotProblem(proposal.startsAt, now) === "too_soon") {
    refuse(messagesFor(locale).challenge.errors.recheck.tooSoon);
  }
  await checkProposalTerms(tx, {
    sport: challenge.sport,
    venueId: proposal.venueId,
    courtId: proposal.courtId,
    startsAt: proposal.startsAt,
    now,
    locale,
  });
}

/**
 * A pair's Positions from their Preferred Positions: a picked side first,
 * Either takes what is left, two Either players go left then right, and of
 * two players who picked the same side the first keeps it.
 */
function pairSeats(
  members: Roster["members"],
): { userId: string; choice: SeatChoice }[] {
  const picked = (position: string | null) =>
    position === "left" || position === "right" ? position : null;
  const ordered = [...members].sort(
    (a, b) =>
      Number(picked(b.preferredPosition) != null) -
      Number(picked(a.preferredPosition) != null),
  );
  const first = picked(ordered[0]?.preferredPosition ?? null);
  return ordered.map((member, index) => {
    const own = picked(member.preferredPosition);
    if (index === 0 || own == null) {
      return { userId: member.userId, choice: own ?? "either" };
    }
    return {
      userId: member.userId,
      choice: own === first ? otherPosition(own) : own,
    };
  });
}

async function seatPadelPairs(
  tx: Tx,
  game: GameRow,
  pairs: readonly Roster[],
  locale: Locale = DEFAULT_LOCALE,
) {
  for (const [index, roster] of pairs.entries()) {
    let gameTeamId: string | null = null;
    for (const seat of pairSeats(roster.members)) {
      const occupied = await occupySeat(
        tx,
        game,
        seat.userId,
        index + 1,
        seat.choice,
        undefined,
        locale,
      );
      gameTeamId = occupied.id;
    }
    if (gameTeamId) {
      await tx
        .update(gameTeams)
        .set({ teamId: roster.team.id, updatedAt: new Date() })
        .where(eq(gameTeams.id, gameTeamId));
    }
  }
}

/** Two empty sides bound to the Teams, in black and white, the one Match and its Score shell. */
async function openFootballSides(
  tx: Tx,
  game: GameRow,
  pairs: readonly Roster[],
  courtId: string | null,
  durationInMinutes: number,
) {
  const bibs = [DEFAULT_FOOTBALL_BIBS.slot1, DEFAULT_FOOTBALL_BIBS.slot2];
  const sides = await tx
    .insert(gameTeams)
    .values(
      pairs.map((roster, index) => ({
        gameId: game.id,
        teamId: roster.team.id,
        sideIndex: index + 1,
        bib: bibs[index],
      })),
    )
    .returning({ id: gameTeams.id, sideIndex: gameTeams.sideIndex });
  const slot1 = sides.find((side) => side.sideIndex === 1);
  const slot2 = sides.find((side) => side.sideIndex === 2);
  const [match] = await tx
    .insert(matches)
    .values({
      gameId: game.id,
      courtId,
      startTime: game.windowStart,
      endTime: game.windowEnd,
      durationInMinutes,
      slot1GameTeamId: slot1?.id ?? null,
      slot2GameTeamId: slot2?.id ?? null,
    })
    .returning({ id: matches.id });
  if (!match || !slot1 || !slot2) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }
  await tx
    .insert(matchSets)
    .values({ matchId: match.id, setNumber: FOOTBALL_SCORE_SET_NUMBER });
}

/**
 * "Confirm, make it a game": the posting Team confirms one pending Proposal.
 * Every propose rule is read again for both Teams, then, in one transaction,
 * the Challenge Game is created with no Group, registration closed and both
 * Game teams bound to the Teams. Both count for Temba Level. Padel seats
 * both pairs; football opens two empty sides of `side + 3` seats, the one
 * Match and its Score shell, and moves OVR once each Team confirms the score
 * (ADR-0069). The other pending Proposals are passed over and told.
 */
export async function confirmProposal(
  database: DbClient,
  args: { proposalId: string; userId: string; now?: Date; locale?: Locale },
) {
  const now = args.now ?? new Date();
  const locale = args.locale ?? DEFAULT_LOCALE;
  const m = messagesFor(locale).challenge;
  return database.transaction(async (tx) => {
    const locked = await lockProposalWithChallenge(tx, args.proposalId);
    if (!locked) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: m.errors.proposalNotFound,
      });
    }
    const { proposal, challenge } = locked;
    if (!challenge) {
      throw new TRPCError({ code: "NOT_FOUND", message: m.detail.notFound });
    }
    const [posterTeam, proposingTeam] = await Promise.all([
      tx.query.teams.findFirst({ where: eq(teams.id, challenge.teamId) }),
      tx.query.teams.findFirst({ where: eq(teams.id, proposal.teamId) }),
    ]);
    if (!posterTeam || !(await userActsForTeam(tx, posterTeam, args.userId))) {
      throw new TRPCError({ code: "FORBIDDEN", message: m.errors.notActing });
    }
    if (
      proposingTeam &&
      (await userActsForTeam(tx, proposingTeam, args.userId))
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: m.errors.confirmOwnProposal,
      });
    }
    const pendingRows = await tx.query.challengeProposals.findMany({
      where: and(
        eq(challengeProposals.challengeId, challenge.id),
        eq(challengeProposals.status, "pending"),
      ),
    });
    const live = pendingRows.filter((row) => isProposalPending(row, now));
    if (
      challenge.status !== "open" ||
      !isChallengeOpen(challenge, now, live.length > 0)
    ) {
      refuse(m.errors.notOpen);
    }
    if (!proposingTeam || !isProposalPending(proposal, now)) {
      refuse(m.errors.proposalNotPending);
    }

    const poster = await rosterOf(tx, posterTeam);
    const proposer = await rosterOf(tx, proposingTeam);
    await recheck(tx, challenge, proposal, poster, proposer, now, locale);

    const windowStart = proposal.startsAt;
    const windowEnd = new Date(
      windowStart.getTime() + challenge.durationMinutes * MS_PER_MINUTE,
    );
    const pairs = [poster, proposer];
    let game: GameRow;
    if (challenge.sport === "padel") {
      ({ game } = await createFriendlyGame(
        tx,
        {
          createdBy: args.userId,
          groupId: null,
          venueId: proposal.venueId,
          courtId: proposal.courtId,
          windowStart,
          windowEnd,
          rated: true,
          groupRated: false,
          pricePerPlayerFils: proposal.pricePerPlayerFils,
        },
        locale,
      ));
      await seatPadelPairs(tx, game, pairs, locale);
    } else {
      const sideSize =
        challenge.sideSize ?? teamRosterRule("football").completeAt;
      ({ game } = await createFootballGame(
        tx,
        {
          createdBy: args.userId,
          groupId: null,
          venueId: proposal.venueId,
          courtId: proposal.courtId,
          windowStart,
          windowEnd,
          pricePerPlayerFils: proposal.pricePerPlayerFils,
          sideSize,
          playersAllowed: 2 * squadSeatCount(sideSize),
          rated: true,
          groupRated: false,
        },
        locale,
      ));
      await openFootballSides(
        tx,
        game,
        pairs,
        proposal.courtId,
        challenge.durationMinutes,
      );
    }

    await tx
      .update(games)
      .set({
        challengeId: challenge.id,
        registrationClosedAt: now,
        updatedAt: now,
      })
      .where(eq(games.id, game.id));
    await tx
      .update(challenges)
      .set({
        status: "confirmed",
        confirmedProposalId: proposal.id,
        gameId: game.id,
        confirmedAt: now,
        updatedAt: now,
      })
      .where(eq(challenges.id, challenge.id));
    await tx
      .update(challengeProposals)
      .set({
        status: "confirmed",
        decidedBy: args.userId,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(challengeProposals.id, proposal.id));

    const passedOver = live.filter((row) => row.id !== proposal.id);
    if (passedOver.length > 0) {
      await tx
        .update(challengeProposals)
        .set({ status: "passed_over", decidedAt: now, updatedAt: now })
        .where(
          inArray(
            challengeProposals.id,
            passedOver.map((row) => row.id),
          ),
        );
    }
    for (const row of [proposal, ...passedOver]) {
      await removeJob(tx, proposalExpireJobKey(row.id));
    }
    await removeJob(tx, challengeExpireJobKey(challenge.id));
    if (challenge.sport === "football") {
      await scheduleSquadDue(tx, game.id, windowStart, now);
    }

    await notifyProposalConfirmed(tx, {
      challengeId: challenge.id,
      proposalId: proposal.id,
      gameId: game.id,
      posterTeam,
      proposingTeam,
      confirmedBy: args.userId,
    });
    const otherTeams =
      passedOver.length === 0
        ? []
        : await tx.query.teams.findMany({
            where: inArray(
              teams.id,
              passedOver.map((row) => row.teamId),
            ),
            columns: { id: true, sport: true, createdBy: true, groupId: true },
          });
    for (const row of passedOver) {
      const team = otherTeams.find((candidate) => candidate.id === row.teamId);
      if (team) {
        await notifyProposalPassedOver(tx, {
          challengeId: challenge.id,
          proposalId: row.id,
          proposingTeam: team,
          posterTeamId: posterTeam.id,
        });
      }
    }
    return { gameId: game.id };
  });
}

export const confirmProposalProcedure = protectedProcedure
  .input(z.object({ proposalId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return confirmProposal(ctx.db, {
      proposalId: input.proposalId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
