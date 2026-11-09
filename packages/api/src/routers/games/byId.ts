import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  bookings,
  challengeProposals,
  challenges,
  courts,
  gameCourts,
  gamePlayers,
  gameTeams,
  gameWaitlist,
  groups,
  matches,
  ratingEvents,
  ratings,
  teamMembers,
  teams,
  user,
  venues,
} from "@repo/db";

import { challengeCostLine } from "@repo/domain/challenge-game-details";
import { isFootballGame } from "@repo/domain/game-shape";
import { youRatingViewAfterIdle } from "@repo/domain/idle";
import { initials } from "@repo/domain/initials";
import { SQUAD_RESERVE_SEATS } from "@repo/domain/matchday-squad";

import { showsFriendlyRoster } from "@repo/domain/game-summary-cta";
import { postedKnockoutRounds } from "@repo/domain/tournament-knockout-view";
import {
  isPartnerRequiredGame,
  isDrawnTournament,
} from "@repo/domain/tournament-rounds";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  canViewGame,
  getRegistrationStatus,
  isGameOrganizer,
  isGroupMember,
  registeredGameTeamCount,
  registeredUserCount,
  requireGame,
  userPassesJoinGate,
} from "#src/games/access";
import {
  homeCarouselPhase,
  type HomeCarouselCandidate,
  type HomeCarouselPhase,
} from "#src/home/carousel-games";
import { userAlreadyOnGame } from "#src/games/helpers/user-already-on-game";
import { viewerLevelRangeFields } from "#src/games/level-range-requests";
import {
  matchResultConfirmationCompletedAt,
  matchOrganizerSides,
  matchResultConfirmedUserIds,
  matchSeatedUserIds,
  type MatchSlot,
} from "#src/games/match-result-confirmations";
import { listGameSeatHolds } from "#src/games/seat-holds";
import { userAllowedByLevelRange } from "#src/games/user-allowed-by-level-range";
import {
  isIndividualSeatGame,
  listGameSides,
  sitsOnCompletedMatch,
  type SeatOccupant,
} from "#src/games/seats";
import { isRosterRegistrationGame } from "@repo/domain/game-shape";
import { bothSlotsFilled } from "#src/games/both-slots-filled";
import { bothSlottedTeamsComplete } from "#src/games/both-slotted-teams-complete";
import {
  isKnockoutMatch,
  knockoutMatchIsLevel,
} from "#src/games/knockout-advance";
import { matchOutcome } from "@repo/domain/match-outcome";
import { computePoolTables } from "@repo/domain/pool-table";
import { setWinsForGames } from "@repo/domain/set-wins-for-games";
import {
  bandFromLevel,
  bandWithHysteresis,
  formatLevel,
  isProvisional,
  levelFromMu,
  ratedMatchesRemainingToConfirm,
  type LevelBand,
} from "@repo/domain/level";
import {
  wrongScoreReversalEligibility,
  type WrongScoreReversalEligibility,
} from "#src/games/wrong-score-reversal";
import { groupSeasonRows } from "#src/games/season-link";
import { toSeasonRow } from "#src/standing/load-group-standing";
import { MATCH_STATUS } from "@repo/domain/match-status";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";
import { maskPhone } from "#src/unclaimed-players/mask-phone";

import { listLevelRangeRequests } from "./listLevelRangeRequests";
import { gameRatingScope } from "@repo/domain/game-rating-scope";
import { loadTeamDisplayNames } from "#src/challenges/challenge-proposals";
import { loadChallengeSides } from "#src/games/challenge-squad";
import { userActsForTeam } from "#src/teams/acts-for-team";
import { loadTeamMatches, teamRecordFromMatches } from "#src/teams/team-record";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type GameRow = Awaited<ReturnType<typeof requireGame>>;

/**
 * The Challenge variant of Game details: where the Game came from, who
 * agreed it, both Teams with their records and head-to-head, each side's
 * named squad, the Pitch or Court, the cost line, and the side the viewer
 * may still name. Null on a Game that came from no Challenge.
 */
async function challengeGameDetails(
  database: DbClient,
  game: GameRow,
  args: {
    userId: string;
    locale: Locale;
    unclaimed: (userId: string) => boolean;
    courtName: string | null;
    venueName: string | null;
  },
) {
  if (!game.challengeId) {
    return null;
  }
  const challenge = await database.query.challenges.findFirst({
    where: eq(challenges.id, game.challengeId),
    columns: {
      id: true,
      teamId: true,
      createdAt: true,
      confirmedProposalId: true,
    },
  });
  if (!challenge) {
    return null;
  }
  const proposal = challenge.confirmedProposalId
    ? await database.query.challengeProposals.findFirst({
        where: eq(challengeProposals.id, challenge.confirmedProposalId),
        columns: { teamId: true, proposedBy: true, decidedBy: true },
      })
    : undefined;
  const peopleIds = [proposal?.proposedBy, proposal?.decidedBy].filter(
    (id): id is string => id != null,
  );
  const people =
    peopleIds.length > 0
      ? await database.query.user.findMany({
          where: inArray(user.id, peopleIds),
          columns: { id: true, name: true },
        })
      : [];
  const nameOf = (id: string | null | undefined) =>
    people.find((person) => person.id === id)?.name ?? null;

  const sides = (await loadChallengeSides(database, game)) ?? [];
  const teamIds = sides.flatMap((side) => (side.teamId ? [side.teamId] : []));
  const teamRows =
    teamIds.length > 0
      ? await database.query.teams.findMany({
          where: inArray(teams.id, teamIds),
          columns: { id: true, sport: true, createdBy: true, groupId: true },
        })
      : [];
  const names = await loadTeamDisplayNames(database, teamIds);
  const matchesByTeam = await loadTeamMatches(database, teamIds);

  const namedIds = sides.flatMap((side) =>
    side.named.map((player) => player.userId),
  );
  const ratingRows =
    namedIds.length > 0
      ? await database.query.ratings.findMany({
          where: and(
            inArray(ratings.userId, namedIds),
            eq(ratings.sport, isFootballGame(game) ? "football" : "padel"),
          ),
        })
      : [];
  const now = new Date();
  const levelBandOf = (userId: string) => {
    const row = ratingRows.find((rating) => rating.userId === userId);
    return row ? youRatingViewAfterIdle(row, now).levelBand : null;
  };

  const sideViews = await Promise.all(
    sides.map(async (side) => {
      const team = teamRows.find((row) => row.id === side.teamId);
      const opponentTeamId =
        sides.find((other) => other.gameTeamId !== side.gameTeamId)?.teamId ??
        null;
      const teamMatches = side.teamId
        ? (matchesByTeam.get(side.teamId) ?? [])
        : [];
      const meetings = teamMatches.filter(
        (match) =>
          opponentTeamId != null && match.opponentTeamId === opponentTeamId,
      );
      const record = teamRecordFromMatches(teamMatches);
      const headToHead = teamRecordFromMatches(meetings);
      const name = side.teamId ? (names.get(side.teamId) ?? null) : null;
      return {
        teamId: side.teamId,
        gameTeamId: side.gameTeamId,
        sideIndex: side.sideIndex,
        name,
        initials: initials(name ?? ""),
        record: {
          wins: record.wins,
          draws: record.draws,
          losses: record.losses,
        },
        headToHead:
          headToHead.gamesPlayed > 0
            ? {
                wins: headToHead.wins,
                draws: headToHead.draws,
                losses: headToHead.losses,
              }
            : null,
        sideSize: side.sideSize,
        reserveSeats: SQUAD_RESERVE_SEATS,
        named: side.named.map((player) => ({
          userId: player.userId,
          name: player.name,
          image: player.image,
          role: player.footballRole,
          position: player.footballPosition,
          levelBand: levelBandOf(player.userId),
          unclaimed: args.unclaimed(player.userId),
        })),
        state: side.squadState,
        viewerActs: team
          ? await userActsForTeam(database, team, args.userId)
          : false,
        viewerIsCaptain: team?.createdBy === args.userId,
      };
    }),
  );
  const namable =
    isFootballGame(game) && !game.cancelledAt
      ? sideViews.find((side) => side.viewerActs && side.state !== "locked")
      : undefined;

  return {
    id: challenge.id,
    postedByTeamId: challenge.teamId,
    postedByTeamName: names.get(challenge.teamId) ?? null,
    postedAt: challenge.createdAt,
    proposedBy: {
      userId: proposal?.proposedBy ?? null,
      name: nameOf(proposal?.proposedBy),
      teamId: proposal?.teamId ?? null,
      teamName: proposal?.teamId ? (names.get(proposal.teamId) ?? null) : null,
    },
    confirmedBy: {
      userId: proposal?.decidedBy ?? null,
      name: nameOf(proposal?.decidedBy),
      isViewer:
        proposal?.decidedBy != null && proposal.decidedBy === args.userId,
    },
    sides: sideViews,
    pitch: { venueName: args.venueName, courtName: args.courtName },
    costLine: challengeCostLine(
      { sport: game.sport, pricePerPlayerFils: game.pricePerPlayerFils },
      args.locale,
    ),
    viewerCanNameSide: namable?.teamId ?? null,
  };
}

/**
 * Individual Friendly game details phase (game-details redesign, TEM-177).
 * `needs_results` reuses `isHomeCarouselNeedsResults`/`homeCarouselPhase`'s
 * exact rule shape (`#src/home/carousel-games.ts`), adapted to this
 * Game's single Match rather than a hub list's many-Game/many-Match scan.
 */
export type GameDetailsPhase = HomeCarouselPhase | "final" | "cancelled";

type GameDetailsPhaseGame = {
  id: string;
  groupId: string | null;
  cancelledAt: Date | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  createdAt: Date;
  format: string;
  createdBy: string;
  registrationMode: string;
  playersAllowed: number | null;
  teamsAllowed: number | null;
};

function individualFriendlyGamePhase(args: {
  game: GameDetailsPhaseGame;
  match: { status: string | null; startTime: Date | null } | undefined;
  registeredUserCount: number;
  registeredTeamCount: number;
  now: Date;
}): GameDetailsPhase {
  const { game, match, registeredUserCount, registeredTeamCount, now } = args;

  if (
    game.cancelledAt !== null ||
    match?.status === MatchStatusEnum.CANCELLED
  ) {
    return "cancelled";
  }
  if (match?.status === MatchStatusEnum.COMPLETED) {
    return "final";
  }

  const candidate: HomeCarouselCandidate = {
    id: game.id,
    groupId: game.groupId,
    cancelledAt: game.cancelledAt,
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    createdAt: game.createdAt,
    format: game.format,
    matches: match
      ? [{ startTime: match.startTime, status: match.status }]
      : [],
    createdBy: game.createdBy,
    // Neither field is read by isHomeCarouselNeedsResults/homeCarouselPhase —
    // this door computes phase for the Game's own details page, not a
    // viewer-scoped carousel membership list.
    viewerHasGameAdmit: false,
    viewerIsOrganizer: false,
    registrationMode: game.registrationMode,
    playersAllowed: game.playersAllowed,
    teamsAllowed: game.teamsAllowed,
    registeredUserCount,
    registeredTeamCount,
  };

  const phase = homeCarouselPhase(candidate, now);
  if (phase) {
    return phase;
  }

  // homeCarouselPhase returns null only when the Game is neither live nor
  // needs_results (its window ended without ever reaching cap, so its one
  // Match never had a chance to be scored). Home simply drops such a Game
  // from the carousel; the details screen has no "drop it" option and the
  // same "nobody has entered a result" description still applies, so it
  // resolves to needs_results here too.
  return "needs_results";
}

export async function gameById(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId);

  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Game not found",
    });
  }

  const now = new Date();
  const organizer = await isGameOrganizer(database, game, args.userId);
  const passesGate = await userPassesJoinGate(database, game, args.userId);
  const alreadyOnGame = await userAlreadyOnGame(database, game.id, args.userId);
  const userCount = await registeredUserCount(database, game.id);
  const teamCount = await registeredGameTeamCount(database, game.id);
  const registrationStatus = await getRegistrationStatus(database, game, now);
  const waitlistRows = await database.query.gameWaitlist.findMany({
    where: eq(gameWaitlist.gameId, game.id),
    with: {
      user: { columns: { id: true, name: true, image: true } },
      team: { columns: { id: true, name: true } },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });

  const matchRows = await database.query.matches.findMany({
    where: eq(matches.gameId, game.id),
    with: {
      court: {
        columns: { id: true, name: true },
      },
      sets: {
        orderBy: (table, { asc }) => [asc(table.setNumber)],
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const recordedCourtRows = await database.query.gameCourts.findMany({
    where: eq(gameCourts.gameId, game.id),
    with: {
      court: { columns: { id: true, name: true } },
    },
  });

  const teamRows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, game.id),
    with: {
      team: {
        columns: { id: true, name: true },
      },
      players: {
        with: {
          gamePlayer: {
            with: {
              user: {
                columns: { id: true, name: true, image: true },
              },
            },
          },
        },
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const playerRows = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, game.id),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
          clerkId: true,
          addedAt: true,
          phoneNumber: true,
        },
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });
  const playerMarkByUserId = new Map(
    playerRows.flatMap((row) => {
      if (!row.user) {
        return [];
      }
      const unclaimed = isUnclaimed(row.user);
      const phoneMasked =
        organizer && unclaimed && row.user.phoneNumber
          ? maskPhone(row.user.phoneNumber)
          : null;
      return [[row.user.id, { unclaimed, phoneMasked }] as const];
    }),
  );
  const playerMark = (userId: string) =>
    playerMarkByUserId.get(userId) ?? { unclaimed: false, phoneMasked: null };

  const group = game.groupId
    ? await database.query.groups.findFirst({
        where: eq(groups.id, game.groupId),
        columns: { id: true, name: true },
      })
    : null;
  const seasonRows = game.groupId
    ? await groupSeasonRows(database, game.groupId)
    : [];
  const groupSeasons = seasonRows.map((row) => toSeasonRow(row, now));
  const season = groupSeasons.find((row) => row.id === game.seasonId) ?? null;
  const scoreConfirmed = matchRows.some(
    (match) => match.status === MATCH_STATUS.COMPLETED,
  );

  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, game.venueId),
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      archivedAt: true,
      logoImageUrl: true,
    },
  });

  const [booking] = await database
    .select({
      id: bookings.id,
      userId: bookings.userId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      courtName: courts.name,
    })
    .from(bookings)
    .innerJoin(courts, eq(courts.id, bookings.courtId))
    .where(eq(bookings.gameId, game.id));

  const memberships = await database.query.teamMembers.findMany({
    where: eq(teamMembers.userId, args.userId),
    columns: { teamId: true },
  });
  const myTeamIds = memberships.map((row) => row.teamId);
  const isWaitlisted = waitlistRows.some(
    (row) =>
      row.userId === args.userId ||
      (row.teamId !== null && myTeamIds.includes(row.teamId)),
  );
  const waitlistIndex = waitlistRows.findIndex(
    (row) =>
      row.userId === args.userId ||
      (row.teamId !== null && myTeamIds.includes(row.teamId)),
  );
  const waitlistPlace =
    isWaitlisted && waitlistIndex >= 0 ? waitlistIndex + 1 : null;
  const eligibleTeams = [];
  if (game.registrationMode === "team_only" && myTeamIds.length > 0) {
    const memberRows = await database.query.teamMembers.findMany({
      where: inArray(teamMembers.teamId, myTeamIds),
      with: {
        team: { columns: { id: true, name: true } },
        user: { columns: { id: true, name: true, image: true } },
      },
    });
    const byTeam = new Map<string, typeof memberRows>();
    for (const row of memberRows) {
      const list = byTeam.get(row.teamId) ?? [];
      list.push(row);
      byTeam.set(row.teamId, list);
    }
    for (const [teamId, members] of byTeam) {
      if (members.length !== 2) {
        continue;
      }
      const partnerIds = members.map((member) => member.userId);
      const bothAllowed = (
        await Promise.all(
          partnerIds.map(async (userId) => {
            if (!(await userPassesJoinGate(database, game, userId))) {
              return false;
            }
            return userAllowedByLevelRange(database, game, userId);
          }),
        )
      ).every(Boolean);
      if (!bothAllowed) {
        continue;
      }
      const already = teamRows.some((row) => row.teamId === teamId);
      if (already) {
        continue;
      }
      const names = members.map((member) => member.user.name);
      eligibleTeams.push({
        id: teamId,
        name: members[0]?.team.name ?? names.join(" / "),
        memberNames: names,
      });
    }
  }

  const myGameTeamIds = new Set(
    teamRows
      .filter((row) =>
        row.players.some((link) => link.gamePlayer.user?.id === args.userId),
      )
      .map((row) => row.id),
  );

  const seatedUserIds = new Set(
    teamRows.flatMap((row) =>
      row.players.flatMap((link) =>
        link.gamePlayer.user?.id ? [link.gamePlayer.user.id] : [],
      ),
    ),
  );
  const isSeated = seatedUserIds.has(args.userId);
  const unseatedPlayers = playerRows.flatMap((row) =>
    row.user && !seatedUserIds.has(row.user.id)
      ? [
          {
            id: row.user.id,
            name: row.user.name,
            image: row.user.image,
            ...playerMark(row.user.id),
          },
        ]
      : [],
  );
  const sides =
    isIndividualSeatGame(game) ||
    isDrawnTournament(game.format, game.poolCount, game.tournamentShape)
      ? await listGameSides(database, game)
      : [];
  const canPickSeat =
    alreadyOnGame &&
    !isSeated &&
    registrationStatus !== "cancelled" &&
    registrationStatus !== "closed";
  const hasVacantPosition = sides.some(
    (side) => side.left == null || side.right == null,
  );
  let sitsCompleted = false;
  if (isSeated) {
    for (const teamId of myGameTeamIds) {
      if (await sitsOnCompletedMatch(database, game.id, teamId)) {
        sitsCompleted = true;
        break;
      }
    }
  }
  const partnerRequired = isPartnerRequiredGame(game);
  const canMove =
    !partnerRequired &&
    isSeated &&
    registrationStatus === "open" &&
    hasVacantPosition &&
    !sitsCompleted;
  const levelRange = await viewerLevelRangeFields(
    database,
    game,
    args.userId,
    organizer,
  );
  const pendingLevelRangeRequests = organizer
    ? await listLevelRangeRequests(database, {
        gameId: game.id,
        userId: args.userId,
      })
    : [];
  const pendingSeatHolds = organizer
    ? await listGameSeatHolds(database, game, args.userId, now)
    : [];

  // `sides[].left/right` per-seat Level band (TEM-177): joined from the
  // existing `ratings` table for every seated User across every side, `null`
  // when the seated User has no Rating yet for this Game's sport.
  const seatedOccupantUserIds = [
    ...new Set(
      sides.flatMap((side) =>
        [side.left?.userId, side.right?.userId].filter(
          (userId): userId is string => Boolean(userId),
        ),
      ),
    ),
  ];
  const ratingSport: "padel" | "football" =
    game.sport === "football" ? "football" : "padel";
  const levelBandByUserId = new Map<string, LevelBand>();
  if (seatedOccupantUserIds.length > 0) {
    const seatedRatingRows = await database.query.ratings.findMany({
      where: and(
        inArray(ratings.userId, seatedOccupantUserIds),
        eq(ratings.sport, ratingSport),
      ),
      columns: { userId: true, levelBand: true },
    });
    for (const row of seatedRatingRows) {
      levelBandByUserId.set(row.userId, row.levelBand);
    }
  }
  const withLevelBand = (occupant: SeatOccupant | null) =>
    occupant
      ? {
          ...occupant,
          levelBand: levelBandByUserId.get(occupant.userId) ?? null,
          ...playerMark(occupant.userId),
        }
      : null;
  const sidesWithLevelBand = sides.map((side) => ({
    ...side,
    left: withLevelBand(side.left),
    right: withLevelBand(side.right),
  }));

  // Individual Friendly game (`showsFriendlyRoster`) additive read model
  // (TEM-177): derived `phase`, Match result confirmation state (ADR-0011,
  // TEM-176), and viewer-scoped rating-impact fields for the Final phase.
  // Americano, Friendly tournament, and team_only Games get `null` for all
  // three — this screen's redesign is scoped to individual Friendly games
  // only (`.scratch/game-details-redesign/spec.md`).
  const isIndividualFriendlyGame = showsFriendlyRoster(
    game.format,
    game.registrationMode,
  );
  const friendlyMatch = isIndividualFriendlyGame ? matchRows[0] : undefined;

  const phase: GameDetailsPhase | null =
    isIndividualFriendlyGame && friendlyMatch
      ? individualFriendlyGamePhase({
          game,
          match: {
            status: friendlyMatch.status,
            startTime: friendlyMatch.startTime,
          },
          registeredUserCount: userCount,
          registeredTeamCount: teamCount,
          now,
        })
      : null;

  let matchResultConfirmation: {
    confirmedUserIds: string[];
    requiredUserIds: string[];
    viewerHasConfirmed: boolean;
    // Final-phase-only Score section footer copy (TEM-181): "Confirmed by
    // all four players on [date]." The latest confirmation row's timestamp,
    // not a proxy off `match.updatedAt` (which any unrelated Match edit,
    // e.g. a court change, could also touch) — additive read of an existing
    // column, no schema change.
    confirmedAt: Date | null;
    organizerSides?: { slot: MatchSlot; confirmed: boolean }[];
    // A final Match that not every required player confirmed was confirmed
    // by an Organizer (ADR-0044).
    confirmedByOrganizer: boolean;
  } | null = null;

  let ratingImpact: {
    levelChange: number;
    newLevel: number;
    newLevelBand: LevelBand;
    isProvisional: boolean;
    ratedMatchesRemainingToConfirm: number | null;
  } | null = null;

  // Final-phase-only, organizer-only "Report a wrong score" eligibility read
  // (TEM-185): lets the UI render the disabled/support-routed state without
  // a failed `reportWrongScore` round-trip. Same eligibility rule the door
  // enforces (Option A, `.scratch/game-details-redesign/spec.md` "Resolved
  // decision"), read-only here.
  let canReportWrongScore: WrongScoreReversalEligibility | null = null;

  if (isIndividualFriendlyGame && friendlyMatch) {
    const [requiredUserIds, confirmedUserIds, organizerSides] =
      await Promise.all([
        matchSeatedUserIds(database, friendlyMatch),
        matchResultConfirmedUserIds(database, friendlyMatch.id),
        matchOrganizerSides(database, friendlyMatch),
      ]);
    const confirmedByOrganizer =
      phase === "final" &&
      (requiredUserIds.length === 0 ||
        requiredUserIds.some((userId) => !confirmedUserIds.includes(userId)));
    const confirmedAt =
      phase === "final" && !confirmedByOrganizer
        ? await matchResultConfirmationCompletedAt(database, friendlyMatch.id)
        : null;
    matchResultConfirmation = {
      confirmedUserIds,
      requiredUserIds,
      viewerHasConfirmed: confirmedUserIds.includes(args.userId),
      confirmedAt,
      organizerSides,
      confirmedByOrganizer,
    };

    if (phase === "final") {
      const viewerRatingEvent = game.rated
        ? await database.query.ratingEvents.findFirst({
            where: and(
              eq(ratingEvents.matchId, friendlyMatch.id),
              eq(ratingEvents.userId, args.userId),
            ),
            columns: { muBefore: true, muAfter: true, phiAfter: true },
          })
        : undefined;
      if (viewerRatingEvent) {
        const beforeLevel = levelFromMu(viewerRatingEvent.muBefore);
        const afterLevel = levelFromMu(viewerRatingEvent.muAfter);
        const newLevel = Number(formatLevel(afterLevel));
        const levelChange =
          Math.round((newLevel - Number(formatLevel(beforeLevel))) * 10) / 10;
        // ratingEvents stores only before/after μ/φ/σ, not the stored Level
        // band that was in effect immediately before this Match — so the
        // hysteresis anchor is the strict band for the before-Level. This
        // matches applyRatedMatch's own bandWithHysteresis(after, before)
        // shape without reimplementing it.
        const newLevelBand = bandWithHysteresis(
          afterLevel,
          bandFromLevel(beforeLevel),
        );
        const viewerIsProvisional = isProvisional(viewerRatingEvent.phiAfter);
        ratingImpact = {
          levelChange,
          newLevel,
          newLevelBand,
          isProvisional: viewerIsProvisional,
          ratedMatchesRemainingToConfirm: viewerIsProvisional
            ? ratedMatchesRemainingToConfirm(viewerRatingEvent.phiAfter)
            : null,
        };
      }

      if (organizer) {
        canReportWrongScore = await wrongScoreReversalEligibility(
          database,
          friendlyMatch.id,
        );
      }
    }
  }

  const registeredPlayers = playerRows.flatMap((row) =>
    row.user
      ? [
          {
            id: row.user.id,
            name: row.user.name,
            image: row.user.image,
            ...playerMark(row.user.id),
          },
        ]
      : [],
  );

  const canRegister =
    registrationStatus === "open" &&
    passesGate &&
    levelRange.viewerPassesLevelRange &&
    !alreadyOnGame &&
    !isWaitlisted;
  const canWaitlist =
    !partnerRequired &&
    registrationStatus === "full" &&
    passesGate &&
    levelRange.viewerPassesLevelRange &&
    !alreadyOnGame &&
    !isWaitlisted;
  const isChallengeGame = game.challengeId != null;
  const challenge = await challengeGameDetails(database, game, {
    userId: args.userId,
    locale,
    unclaimed: (userId) => playerMark(userId).unclaimed,
    venueName: venue?.name ?? null,
    courtName:
      matchRows.find((match) => match.status !== MatchStatusEnum.CANCELLED)
        ?.court?.name ??
      recordedCourtRows[0]?.court?.name ??
      null,
  });
  // Door-level flags: a Challenge Game's sides are the two Teams, so nobody
  // joins, is invited, added or sorted into teams there. Screens keep their
  // own state checks on top.
  const organizesOpenGame = organizer && !game.cancelledAt && !isChallengeGame;

  return {
    id: game.id,
    name: game.name,
    hasCustomName: game.hasCustomName,
    format: game.format,
    registrationMode: game.registrationMode,
    allowSoloRegister: game.allowSoloRegister,
    isPublic: game.isPublic,
    rated: game.rated,
    ratingScope: gameRatingScope(game),
    groupId: game.groupId,
    groupName: group?.name ?? null,
    seasonId: game.seasonId,
    season,
    groupSeasons,
    canChangeSeason: organizer && !game.cancelledAt && !scoreConfirmed,
    venueId: game.venueId,
    venue: venue
      ? {
          name: venue.name,
          city: venue.city,
          country: venue.country,
          latitude: venue.latitude,
          longitude: venue.longitude,
          archivedAt: venue.archivedAt,
          logoImageUrl: venue.logoImageUrl,
        }
      : null,
    booking: booking
      ? {
          id: booking.id,
          courtName: booking.courtName,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          heldByViewer: booking.userId === args.userId,
        }
      : null,
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    pricePerPlayerFils: game.pricePerPlayerFils,
    levelMinTenths: game.levelMinTenths,
    levelMaxTenths: game.levelMaxTenths,
    playersAllowed: game.playersAllowed,
    teamsAllowed: game.teamsAllowed,
    poolCount: game.poolCount,
    tournamentShape: game.tournamentShape,
    qualifiersPerPool: game.qualifiersPerPool,
    roundCount: game.roundCount,
    matchMinutes: game.matchMinutes,
    drawPostedAt: game.drawPostedAt,
    canUndoDraw:
      game.drawPostedAt != null &&
      !matchRows.some(
        (match) =>
          match.sets.length > 0 ||
          match.status === "completed" ||
          match.notFinishedAt != null,
      ),
    sport: game.sport,
    cancelledAt: game.cancelledAt,
    registrationClosedAt: game.registrationClosedAt,
    createdBy: game.createdBy,
    createdAt: game.createdAt,
    isOrganizer: organizer,
    isGroupMember: game.groupId
      ? await isGroupMember(database, game.groupId, args.userId)
      : false,
    viewerUserId: args.userId,
    isRegistered: alreadyOnGame,
    isSeated,
    isWaitlisted,
    waitlistPlace,
    registrationStatus,
    canRegister,
    canWaitlist,
    canPickSeat,
    canMove,
    canLeave: alreadyOnGame || isWaitlisted,
    registeredUserCount: userCount,
    registeredTeamCount: teamCount,
    waitlist: waitlistRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      teamId: row.teamId,
      createdAt: row.createdAt,
      name: row.user?.name ?? row.team?.name ?? "Waitlisted",
      image: row.user?.image ?? null,
    })),
    matches: await Promise.all(
      matchRows.map(async (match) => {
        const onSides =
          Boolean(match.slot1GameTeamId) &&
          Boolean(match.slot2GameTeamId) &&
          (myGameTeamIds.has(match.slot1GameTeamId ?? "") ||
            myGameTeamIds.has(match.slot2GameTeamId ?? ""));
        const frozen =
          match.status === "completed" || match.status === "cancelled";
        const canWriteSets =
          !frozen &&
          game.format !== "americano" &&
          (organizer || onSides) &&
          (!isKnockoutMatch(match) || bothSlotsFilled(match));
        const sidesComplete = await bothSlottedTeamsComplete(database, match);
        const outcome = matchOutcome(match.sets);
        return {
          id: match.id,
          startTime: match.startTime,
          endTime: match.endTime,
          durationInMinutes: match.durationInMinutes,
          roundNumber: match.roundNumber,
          knockoutRound: match.knockoutRound,
          knockoutPosition: match.knockoutPosition,
          status: match.status,
          courtId: match.courtId,
          courtName: match.court?.name ?? null,
          slot1GameTeamId: match.slot1GameTeamId,
          slot2GameTeamId: match.slot2GameTeamId,
          walkoverGameTeamId: match.walkoverGameTeamId,
          bothSlotsFilled: bothSlotsFilled(match),
          bothSidesComplete: sidesComplete,
          canAddSet: canWriteSets && (organizer || onSides),
          canScoreSets: canWriteSets && sidesComplete && (organizer || onSides),
          canComplete:
            !frozen &&
            game.format !== "americano" &&
            (organizer || onSides) &&
            sidesComplete &&
            match.sets.length > 0 &&
            outcome.result !== "none" &&
            !knockoutMatchIsLevel(match, outcome.result),
          outcome,
          sets: match.sets.map((set) => ({
            id: set.id,
            slot1GamesWon: set.slot1GamesWon,
            slot2GamesWon: set.slot2GamesWon,
            wins: setWinsForGames(set.slot1GamesWon, set.slot2GamesWon),
          })),
        };
      }),
    ),
    gameTeams: teamRows.map((row) => ({
      id: row.id,
      teamId: row.teamId,
      name: row.name,
      sideIndex: row.sideIndex,
      poolIndex: row.poolIndex,
      knockoutSeed: row.knockoutSeed,
      members: row.players.flatMap((link) =>
        link.gamePlayer.user
          ? [
              {
                id: link.gamePlayer.user.id,
                name: link.gamePlayer.user.name,
                image: link.gamePlayer.user.image,
                position: link.position,
                ...playerMark(link.gamePlayer.user.id),
              },
            ]
          : [],
      ),
    })),
    sides: sidesWithLevelBand,
    phase,
    matchResultConfirmation,
    ratingImpact,
    canReportWrongScore,
    unseatedPlayers,
    registeredPlayers,
    sideSize: game.sideSize,
    roster: isRosterRegistrationGame(game)
      ? {
          users: registeredPlayers,
          count: userCount,
          cap: game.playersAllowed,
        }
      : null,
    recordedCourts: recordedCourtRows
      .flatMap((row) =>
        row.court ? [{ id: row.court.id, name: row.court.name }] : [],
      )
      .sort((left, right) => {
        const byName = left.name.localeCompare(right.name);
        if (byName !== 0) {
          return byName;
        }
        return left.id.localeCompare(right.id);
      }),
    eligibleTeams,
    ...levelRange,
    pendingLevelRangeRequests,
    pendingSeatHolds,
    poolTables: computePoolTables({
      format: game.format,
      poolCount: game.poolCount,
      viewerUserId: args.userId,
      locale,
      storedRoundCount: game.roundCount,
      gameTeams: teamRows.map((row) => ({
        id: row.id,
        name: row.name,
        sideIndex: row.sideIndex,
        poolIndex: row.poolIndex,
        members: row.players.flatMap((link) =>
          link.gamePlayer.user
            ? [
                {
                  id: link.gamePlayer.user.id,
                  name: link.gamePlayer.user.name,
                },
              ]
            : [],
        ),
      })),
      matches: matchRows.map((match) => ({
        id: match.id,
        status: match.status,
        roundNumber: match.roundNumber,
        knockoutRound: match.knockoutRound,
        startTime: match.startTime,
        slot1GameTeamId: match.slot1GameTeamId,
        slot2GameTeamId: match.slot2GameTeamId,
        sets: match.sets.map((set) => ({
          slot1GamesWon: set.slot1GamesWon,
          slot2GamesWon: set.slot2GamesWon,
        })),
      })),
    }),
    knockout: postedKnockoutRounds({
      viewerUserId: args.userId,
      locale,
      gameTeams: teamRows.map((row) => ({
        id: row.id,
        name: row.name,
        members: row.players.flatMap((link) =>
          link.gamePlayer.user
            ? [
                {
                  id: link.gamePlayer.user.id,
                  name: link.gamePlayer.user.name,
                },
              ]
            : [],
        ),
      })),
      matches: matchRows.map((match) => ({
        id: match.id,
        knockoutRound: match.knockoutRound,
        knockoutPosition: match.knockoutPosition,
        startTime: match.startTime,
        courtName: match.court?.name ?? null,
        slot1GameTeamId: match.slot1GameTeamId,
        slot2GameTeamId: match.slot2GameTeamId,
        status: match.status,
        result: matchOutcome(match.sets).result,
        sets: match.sets.map((set) => ({
          slot1GamesWon: set.slot1GamesWon,
          slot2GamesWon: set.slot2GamesWon,
        })),
        walkoverGameTeamId: match.walkoverGameTeamId,
        slot1SourcePoolIndex: match.slot1SourcePoolIndex,
        slot1SourcePoolPosition: match.slot1SourcePoolPosition,
        slot2SourcePoolIndex: match.slot2SourcePoolIndex,
        slot2SourcePoolPosition: match.slot2SourcePoolPosition,
      })),
    }),
    isChallengeGame,
    challenge,
    canJoin: !isChallengeGame && (canRegister || canWaitlist),
    canInvite: organizesOpenGame,
    canAddPlayer: organizesOpenGame,
    canMakeTeams: organizesOpenGame && isFootballGame(game),
  };
}

export const byId = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return gameById(ctx.db, {
      gameId: input.id,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
