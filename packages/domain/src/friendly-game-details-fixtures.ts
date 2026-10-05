import type {
  FriendlyGameDetails,
  FriendlyGameDetailsSide,
} from "./friendly-game-details";
import type { FriendlyGameOrganizerInput } from "./friendly-game-organizer";
import type { PartnerSuggestion } from "./friendly-game-partner";
import { createGameDetailsFixtures } from "./game-details-fixtures";

const VIEWER_ID = "user-viewer";

export type FriendlyGameDetailsFixtureKey =
  | "nonMember"
  | "full"
  | "levelBlocked"
  | "registered"
  | "partnerBooked"
  | "waitlisted"
  | "ongoing"
  | "needsScore"
  | "needsScorePartial"
  | "final"
  | "cancelled";

export const FRIENDLY_GAME_DETAILS_FIXTURE_LABELS: Record<
  FriendlyGameDetailsFixtureKey,
  string
> = {
  nonMember: "Not a member",
  full: "Full",
  levelBlocked: "Level range blocked",
  registered: "Registered",
  partnerBooked: "With a partner",
  waitlisted: "Waitlisted",
  ongoing: "Ongoing",
  needsScore: "Needs results",
  needsScorePartial: "Partly confirmed",
  final: "Final",
  cancelled: "Cancelled",
};

const VIEWER_DEFAULTS = {
  groupId: "group-bromma",
  groupName: "Bromma Tuesday",
  levelMinTenths: 30,
  levelMaxTenths: 45,
  cancelledAt: null,
  registrationClosedAt: null,
  joinFrozen: false,
  isRegistered: false,
  isWaitlisted: false,
  waitlistPlace: null,
  registrationStatus: "open",
  canRegister: false,
  canWaitlist: false,
  canMove: false,
  viewerLevelTenths: 38,
  canRequestLevelRange: false,
  levelRangeRequest: null,
  canReportWrongScore: null,
} satisfies Partial<FriendlyGameDetails>;

function seat(
  userId: string,
  name: string,
  levelBand: "C1" | "C2" | "C3",
): NonNullable<FriendlyGameDetailsSide["left"]> {
  return { userId, name, image: null, levelBand };
}

function withoutViewer(
  sides: FriendlyGameDetails["sides"],
): FriendlyGameDetails["sides"] {
  return sides.map((side) => ({
    ...side,
    left: side.left?.userId === VIEWER_ID ? null : side.left,
    right: side.right?.userId === VIEWER_ID ? null : side.right,
  }));
}

export function createFriendlyGameDetailsFixtures(
  now = new Date(),
): Record<FriendlyGameDetailsFixtureKey, FriendlyGameDetails> {
  const base = createGameDetailsFixtures(now);

  function game(
    source: (typeof base)[keyof typeof base],
    overrides: Partial<FriendlyGameDetails>,
  ): FriendlyGameDetails {
    return {
      ...VIEWER_DEFAULTS,
      ...source,
      isOrganizer: false,
      ...overrides,
    };
  }

  const partnerBooked = game(base.upcoming, { isRegistered: true });

  const registered = game(base.upcoming, {
    isRegistered: true,
    canMove: true,
    registeredUserCount: 2,
    sides: base.upcoming.sides.map((side) =>
      side.sideIndex === 1 ? { ...side, right: null } : side,
    ),
  });

  const nonMember = game(base.upcoming, {
    isSeated: false,
    canLeave: false,
    canRegister: true,
    registeredUserCount: 1,
    sides: withoutViewer(base.upcoming.sides).map((side) =>
      side.sideIndex === 1 ? { ...side, right: null } : side,
    ),
    matches: base.upcoming.matches.map((match) => ({
      ...match,
      slot1GameTeamId: null,
      canScoreSets: false,
    })),
  });

  const fullSides: FriendlyGameDetails["sides"] = base.needsScore.sides.map(
    (side) =>
      side.sideIndex === 1
        ? {
            ...side,
            left: seat("user-ada", "Ada Lindqvist", "C2"),
            right: seat("user-sam", "Sam Chen", "C1"),
          }
        : side,
  );
  const full = game(base.upcoming, {
    isSeated: false,
    canLeave: false,
    canWaitlist: true,
    registrationStatus: "full",
    registeredUserCount: 4,
    sides: fullSides,
    matches: base.needsScore.matches.map((match) => ({
      ...match,
      canScoreSets: false,
    })),
  });

  const waitlisted = game(full, {
    isWaitlisted: true,
    canWaitlist: false,
    canLeave: true,
    waitlistPlace: 2,
  });

  const levelBlocked = game(nonMember, {
    canRegister: false,
    canRequestLevelRange: true,
    viewerLevelTenths: 22,
  });

  return {
    nonMember,
    full,
    levelBlocked,
    registered,
    partnerBooked,
    waitlisted,
    ongoing: game(base.upcoming, {
      phase: "ongoing",
      isRegistered: true,
      windowStart: new Date(now.getTime() - 20 * 60 * 1000),
      windowEnd: new Date(now.getTime() + 70 * 60 * 1000),
      sides: base.needsScore.sides,
      matches: base.needsScore.matches,
      registeredUserCount: 4,
    }),
    needsScore: game(base.needsScore, { isRegistered: true }),
    needsScorePartial: game(base.needsScorePartiallyConfirmed, {
      isRegistered: true,
    }),
    final: game(base.final, { isRegistered: true }),
    cancelled: game(base.upcoming, {
      phase: "cancelled",
      isRegistered: true,
      cancelledAt: new Date(now.getTime() - 60 * 60 * 1000),
    }),
  };
}

export const PARTNER_SUGGESTION_FIXTURES: {
  playedWithBefore: PartnerSuggestion[];
  fromYourGroups: PartnerSuggestion[];
} = {
  playedWithBefore: [
    {
      id: "user-sam",
      name: "Sam Chen",
      image: null,
      levelBand: "C1",
      preferredPosition: "left",
      gamesTogether: 4,
      ineligible: null,
    },
    {
      id: "user-kim",
      name: "Kim Holm",
      image: null,
      levelBand: "C2",
      preferredPosition: null,
      gamesTogether: 1,
      ineligible: "already_on_game",
    },
  ],
  fromYourGroups: [
    {
      id: "user-ada",
      name: "Ada Lindqvist",
      image: null,
      levelBand: "C2",
      preferredPosition: "right",
      gamesTogether: 0,
      ineligible: null,
    },
    {
      id: "user-elin",
      name: "Elin Nilsson",
      image: null,
      levelBand: "C3",
      preferredPosition: null,
      gamesTogether: 0,
      ineligible: "level_range",
    },
  ],
};

export type FriendlyGameOrganizerFixtureKey =
  | "upcoming"
  | "registrationClosed"
  | "ongoing"
  | "needsScore"
  | "final"
  | "finalLocked"
  | "softArchived"
  | "cancelled";

export const FRIENDLY_GAME_ORGANIZER_FIXTURE_LABELS: Record<
  FriendlyGameOrganizerFixtureKey,
  string
> = {
  upcoming: "Upcoming",
  registrationClosed: "Registration closed",
  ongoing: "Ongoing",
  needsScore: "Needs results",
  final: "Final",
  finalLocked: "Final, locked",
  softArchived: "Soft-archived",
  cancelled: "Cancelled",
};

export function createFriendlyGameOrganizerFixtures(
  now = new Date(),
): Record<FriendlyGameOrganizerFixtureKey, FriendlyGameOrganizerInput> {
  const players = createFriendlyGameDetailsFixtures(now);

  function organizer(
    source: FriendlyGameDetails,
    overrides: Partial<FriendlyGameOrganizerInput> = {},
  ): FriendlyGameOrganizerInput {
    return {
      ...source,
      isOrganizer: true,
      isRegistered: true,
      levelMinTenths: 30,
      levelMaxTenths: 45,
      registeredPlayers: source.sides.flatMap((side) =>
        [side.left, side.right].flatMap((seatRow) =>
          seatRow
            ? [{ id: seatRow.userId, name: seatRow.name, image: null }]
            : [],
        ),
      ),
      unseatedPlayers: [],
      waitlist: [
        {
          id: "waitlist-1",
          userId: "user-waiting",
          teamId: null,
          name: "Noor Haddad",
          image: null,
        },
      ],
      pendingLevelRangeRequests: [
        {
          id: "level-request-1",
          levelTenths: 52,
          provisional: false,
          createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
          user: { id: "user-tariq", name: "Tariq Aziz", image: null },
        },
      ],
      matches: source.matches.map((match) => ({
        ...match,
        courtId: match.courtName ? "court-1" : null,
        canComplete:
          match.status !== "completed" &&
          match.status !== "cancelled" &&
          match.sets.some((set) => set.slot1GamesWon != null),
      })),
      ...overrides,
    };
  }

  const upcoming = organizer(players.registered, {
    registrationStatus: "open",
  });
  const needsScore = organizer(players.needsScorePartial, { canLeave: false });
  const final = organizer(players.final, {
    canReportWrongScore: { eligible: true },
  });

  return {
    upcoming,
    registrationClosed: organizer(players.registered, {
      registrationClosedAt: new Date(now.getTime() - 60 * 60 * 1000),
      registrationStatus: "closed",
    }),
    ongoing: organizer(players.ongoing),
    needsScore,
    final,
    finalLocked: organizer(players.final, {
      canReportWrongScore: {
        eligible: false,
        reason: "A later rated Game exists",
      },
    }),
    softArchived: organizer(players.registered, { joinFrozen: true }),
    cancelled: organizer(players.cancelled),
  };
}
