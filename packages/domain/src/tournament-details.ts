import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import type { SeatHoldRequestRow } from "./seat-hold-request";
import { formatGameCardDay } from "./format-game-start";
import { ratingScopeNotice, ratingScopeOf } from "./game-rating-impact";
import type { GameRatingScope } from "./game-rating-scope";
import type { LevelBand } from "./level-bands";
import type { ComputedPoolTables } from "./pool-table";
import { formatPricePerPlayerFils } from "./price-per-player";
import {
  drawnTournamentProgressLine,
  gameDetailsChrome,
  isTournamentStandingsView,
  knockoutSizeLine,
  tournamentEyebrow,
  tournamentFieldSummary,
  tournamentHomeJoinKind,
  tournamentOrganizerName,
  tournamentRoundCount,
  tournamentSizeLine,
  tournamentStartLine,
  tournamentStatusLine,
  tournamentViewerSide,
} from "./tournament-home";
import { tournamentShowsTakeSeat } from "./tournament-join";
import {
  knockoutChampion,
  knockoutChampionLine,
  viewerMissedKnockout,
  type KnockoutViewPlace,
  type KnockoutViewRound,
} from "./tournament-knockout-view";
import {
  hasKnockout,
  isKnockoutOnly,
  isPartnerRequiredGame,
  plannedKnockoutRoundCount,
  roundsPlayedLabel,
  tournamentRoundSchedule,
  type TournamentRoundScheduleEntry,
} from "./tournament-rounds";
import {
  sizeFriendlyTournament,
  tournamentMatchMinutes,
} from "./tournament-sizing";
import {
  viewerTournamentMatchCount,
  viewerTournamentTotalFils,
} from "./tournament-price";

type Occupant = {
  userId: string;
  name: string;
  image: string | null;
  levelBand: LevelBand | null;
  guest?: boolean;
  /** E.164, sent only to a Group approver for a current member (ADR-0078). */
  phoneNumber?: string | null;
};

export type TournamentDetailsSide = {
  sideIndex: number;
  gameTeamId: string | null;
  left: Occupant | null;
  right: Occupant | null;
};

export type TournamentDetailsSet = {
  id: string;
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
  wins: unknown;
};

export type TournamentDetailsMatch = {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
  durationInMinutes: number | null;
  roundNumber: number | null;
  knockoutRound: number | null;
  knockoutPosition: number | null;
  status: string | null;
  courtId: string | null;
  courtName: string | null;
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
  walkoverGameTeamId: string | null;
  bothSlotsFilled: boolean;
  bothSidesComplete: boolean;
  canAddSet: boolean;
  canScoreSets: boolean;
  /** The viewer may confirm the other team's pending score (ADR-0062). */
  canConfirmScore: boolean;
  /** The viewer is a Verifier who may stamp the entered score (ADR-0072). */
  canStamp?: boolean;
  canComplete: boolean;
  outcome: {
    slot1SetWins: number;
    slot2SetWins: number;
    result: "slot1" | "slot2" | "draw" | "none";
  };
  sets: TournamentDetailsSet[];
};

export type TournamentDetailsGameTeam = {
  id: string;
  teamId: string | null;
  name: string | null;
  sideIndex: number | null;
  poolIndex: number | null;
  knockoutSeed: number | null;
  members: {
    id: string;
    name: string;
    image: string | null;
    position: string | null;
    guest?: boolean;
    /** E.164, sent only to a Group approver for a current member (ADR-0078). */
    phoneNumber?: string | null;
  }[];
};

type Person = { id: string; name: string; image: string | null };

export type TournamentDetails = {
  id: string;
  name: string | null;
  format: string;
  registrationMode: string;
  allowSoloRegister: boolean;
  isPublic: boolean;
  rated: boolean;
  ratingScope?: GameRatingScope;
  groupId: string | null;
  groupName: string | null;
  venueId: string | null;
  venue: {
    name: string;
    city: string | null;
    country: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
    archivedAt: Date | null;
    logoImageUrl: string | null;
  } | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  pricePerPlayerFils: number | null;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  playersAllowed: number | null;
  teamsAllowed: number | null;
  poolCount: number | null;
  tournamentShape: string | null;
  qualifiersPerPool: number | null;
  roundCount: number | null;
  matchMinutes: number | null;
  drawPostedAt: Date | null;
  canUndoDraw: boolean;
  sport: string | null;
  cancelledAt: Date | null;
  registrationClosedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  isOrganizer: boolean;
  viewerUserId: string;
  isRegistered: boolean;
  isSeated: boolean;
  isWaitlisted: boolean;
  waitlistPlace: number | null;
  registrationStatus: string;
  canRegister: boolean;
  canWaitlist: boolean;
  canPickSeat: boolean;
  canMove: boolean;
  canLeave: boolean;
  registeredUserCount: number;
  registeredTeamCount: number;
  waitlist: {
    id: string;
    userId: string | null;
    teamId: string | null;
    createdAt: Date;
    name: string;
    image: string | null;
  }[];
  matches: TournamentDetailsMatch[];
  gameTeams: TournamentDetailsGameTeam[];
  sides: TournamentDetailsSide[];
  phase: string | null;
  matchResultConfirmation: unknown;
  ratingImpact: unknown;
  canReportWrongScore: { eligible: boolean; reason?: string } | null;
  unseatedPlayers: Person[];
  registeredPlayers: Person[];
  recordedCourts: { id: string; name: string }[];
  eligibleTeams: { id: string; name: string; memberNames: string[] }[];
  viewerLevelTenths: number | null;
  viewerPassesLevelRange: boolean;
  levelRangeRequest: { status: string } | null;
  canRequestLevelRange: boolean;
  pendingLevelRangeRequests: {
    id: string;
    levelTenths: number | null;
    provisional: boolean;
    createdAt: Date;
    user: { id: string; name: string | null; image: string | null };
  }[];
  /** Seat holds the viewer may decide (ADR-0057); absent on older API builds. */
  pendingSeatHolds?: SeatHoldRequestRow[];
  poolTables: ComputedPoolTables | null;
  knockout: KnockoutViewRound[] | null;
};

export function isDrawnTournamentDetails(game: {
  format: string;
  poolCount: number | null;
  tournamentShape: string | null;
  registrationMode: string;
}) {
  return (
    gameDetailsChrome(
      game.format,
      game.poolCount,
      game.tournamentShape,
      game.registrationMode,
    ) === "drawn_tournament"
  );
}

export function tournamentPeople(
  game: Pick<
    TournamentDetails,
    "sides" | "registeredPlayers" | "unseatedPlayers" | "gameTeams"
  >,
): { userId: string; name: string }[] {
  const people: { userId: string; name: string }[] = [];
  for (const row of game.sides) {
    if (row.left) {
      people.push({ userId: row.left.userId, name: row.left.name });
    }
    if (row.right) {
      people.push({ userId: row.right.userId, name: row.right.name });
    }
  }
  for (const player of game.registeredPlayers) {
    people.push({ userId: player.id, name: player.name });
  }
  for (const player of game.unseatedPlayers) {
    people.push({ userId: player.id, name: player.name });
  }
  for (const team of game.gameTeams) {
    for (const member of team.members) {
      people.push({ userId: member.id, name: member.name });
    }
  }
  return people;
}

export type TournamentDetailRow = {
  label: string;
  value: string;
  note?: string;
};

function ratingDetailRow(
  scope: GameRatingScope,
  locale: Locale,
): TournamentDetailRow {
  const m = messagesFor(locale);
  const value = {
    temba: m.common.yes,
    group: m.common.no,
    unrated: m.common.no,
  }[scope];
  const note = ratingScopeNotice(scope, locale)?.line;
  return {
    label: m.tournament.home.countsForRating,
    value,
    ...(note ? { note } : {}),
  };
}

export function tournamentDetailRows(args: {
  organizerName: string | null;
  groupName: string | null;
  matchMinutes: number | null;
  pricePerPlayerFils: number | null;
  ratingScope: GameRatingScope;
  seated: boolean;
  totalFils: number | null;
  locale: Locale;
}): TournamentDetailRow[] {
  const m = messagesFor(args.locale);
  const rows: TournamentDetailRow[] = [
    {
      label: m.tournament.home.organizerRow,
      value: args.organizerName ?? m.tournament.home.organizerRow,
    },
    {
      label: m.tournament.home.groupRow,
      value: args.groupName?.trim() ? args.groupName : "—",
    },
    {
      label: m.tournament.sizing.eachMatchRow,
      value: m.tournament.details.minutes(
        tournamentMatchMinutes(args.matchMinutes),
      ),
    },
  ];
  const price = formatPricePerPlayerFils(args.pricePerPlayerFils, args.locale);
  if (price) {
    rows.push({
      label: m.tournament.home.priceRow,
      value: m.tournament.details.pricePerMatchValue(price),
    });
  }
  rows.push(ratingDetailRow(args.ratingScope, args.locale));
  if (args.seated && args.totalFils != null) {
    const amount = formatPricePerPlayerFils(args.totalFils, args.locale);
    if (amount) {
      rows.push({
        label: m.tournament.home.youOweRow,
        value: m.tournament.details.youOweValue(amount),
      });
    }
  }
  return rows;
}

export type TournamentHomeView = {
  drawn: boolean;
  knockoutOnly: boolean;
  thenKnockout: boolean;
  partnerRequired: boolean;
  seated: boolean;
  roundCount: number | null;
  field: ReturnType<typeof tournamentFieldSummary>;
  viewerSide: TournamentDetailsSide | null;
  joinKind: ReturnType<typeof tournamentHomeJoinKind>;
  canTakeSeat: boolean;
  hero: {
    name: string;
    eyebrow: string;
    startLine: string | null;
    sizeLine: string | null;
    statusLine: string;
  };
  detailRows: TournamentDetailRow[];
  canLeaveGame: boolean;
  canJoin: boolean;
  canWaitlist: boolean;
  schedule: TournamentRoundScheduleEntry[];
};

export function tournamentFallbackName(locale: Locale) {
  return messagesFor(locale).tournament.details.fallbackName;
}

export function tournamentHomeView(
  game: TournamentDetails,
  locale: Locale,
): TournamentHomeView {
  const knockoutOnly = isKnockoutOnly(game.format, game.tournamentShape);
  const thenKnockout =
    !knockoutOnly && hasKnockout(game.format, game.tournamentShape);
  const sizing =
    game.poolCount != null && game.teamsAllowed != null
      ? sizeFriendlyTournament(game.teamsAllowed, game.poolCount)
      : null;
  const roundCount = tournamentRoundCount(game);
  const field = tournamentFieldSummary(game.sides);
  const viewerSide = tournamentViewerSide(game.sides, game.viewerUserId);
  const seated = Boolean(viewerSide);
  const partnerRequired = isPartnerRequiredGame(game);
  const joinKind = tournamentHomeJoinKind(
    game.registrationMode,
    game.canRegister,
  );
  const organizerName = tournamentOrganizerName({
    createdBy: game.createdBy,
    people: tournamentPeople(game),
  });
  const statusLine = tournamentStatusLine({
    seated,
    seatsLeft:
      Math.max(field.seatTotal, game.playersAllowed ?? 0) - field.seatsTaken,
    teamCount: game.teamsAllowed ?? game.sides.length,
    organizerName,
    locale,
    knockoutOnly,
    thenKnockout,
  });
  const matchesForViewer = viewerTournamentMatchCount(game);
  const totalFils =
    seated && matchesForViewer != null
      ? viewerTournamentTotalFils(game.pricePerPlayerFils, matchesForViewer)
      : null;
  const schedule =
    roundCount != null && game.windowStart && game.windowEnd
      ? tournamentRoundSchedule({
          windowStart: game.windowStart,
          windowEnd: game.windowEnd,
          roundCount,
          matchMinutes: game.matchMinutes,
        })
      : [];
  const canJoin = joinKind === "join";
  const drawn = isTournamentStandingsView(game.drawPostedAt);

  return {
    drawn,
    knockoutOnly,
    thenKnockout,
    partnerRequired,
    seated,
    roundCount,
    field,
    viewerSide,
    joinKind,
    canTakeSeat: tournamentShowsTakeSeat({
      canJoin,
      seated,
      partnerRequired,
    }),
    hero: {
      name: game.name ?? tournamentFallbackName(locale),
      eyebrow:
        roundCount != null
          ? tournamentEyebrow(roundCount, locale, knockoutOnly)
          : messagesFor(locale).tournament.home.eyebrowPrefix,
      startLine: tournamentStartLine(
        game.windowStart,
        game.venue?.name ?? null,
        locale,
      ),
      sizeLine: knockoutOnly
        ? knockoutSizeLine(game.teamsAllowed ?? game.sides.length, locale)
        : sizing?.ok
          ? tournamentSizeLine(
              sizing.sizing,
              locale,
              plannedKnockoutRoundCount(game),
            )
          : null,
      statusLine,
    },
    detailRows: tournamentDetailRows({
      organizerName,
      groupName: game.groupName,
      matchMinutes: game.matchMinutes,
      pricePerPlayerFils: game.pricePerPlayerFils,
      ratingScope: ratingScopeOf(game),
      seated,
      totalFils,
      locale,
    }),
    // The API refuses a leave once the draw is posted.
    canLeaveGame:
      !drawn &&
      (game.isSeated || game.isRegistered) &&
      game.canLeave &&
      !game.isWaitlisted,
    canJoin,
    canWaitlist: game.canWaitlist && canJoin && !partnerRequired,
    schedule,
  };
}

export type TournamentStandingsView = {
  name: string;
  roundsPlayed: string | null;
  heading: string;
  lead: string;
  finished: boolean;
  championLine: string | null;
  knockoutOnly: boolean;
  groupsThenKnockout: boolean;
  showPoolTables: boolean;
  showKnockoutTree: boolean;
  knockoutSectionTitle: string | null;
  notThrough: boolean;
};

export function tournamentStandingsView(
  game: Pick<
    TournamentDetails,
    | "name"
    | "format"
    | "teamsAllowed"
    | "poolCount"
    | "tournamentShape"
    | "roundCount"
    | "drawPostedAt"
    | "matches"
    | "poolTables"
    | "knockout"
  >,
  locale: Locale,
): TournamentStandingsView {
  const m = messagesFor(locale).tournament;
  const knockoutOnly = isKnockoutOnly(game.format, game.tournamentShape);
  const groupsThenKnockout =
    !knockoutOnly && hasKnockout(game.format, game.tournamentShape);
  const roundCount = tournamentRoundCount(game);
  const champion = knockoutChampion(game.knockout);
  const notThrough =
    groupsThenKnockout &&
    viewerMissedKnockout({
      rounds: game.knockout,
      poolStageFinished: Boolean(game.poolTables?.finished),
      viewerHasTeam: game.poolTables?.viewerPoolIndex != null,
    });
  return {
    name: game.name ?? tournamentFallbackName(locale),
    roundsPlayed: drawnTournamentProgressLine({
      roundsPlayed: roundsPlayedLabel(game.poolTables, roundCount, locale),
      knockout: game.knockout,
      locale,
    }),
    heading: knockoutOnly ? m.knockoutView.heading : m.home.standingsHeading,
    lead: knockoutOnly
      ? m.home.knockoutOnlyLead
      : groupsThenKnockout
        ? m.home.groupsThenKnockoutLead
        : m.home.endsCopy,
    finished: !groupsThenKnockout && Boolean(game.poolTables?.finished),
    championLine: champion ? knockoutChampionLine(champion, locale) : null,
    knockoutOnly,
    groupsThenKnockout,
    showPoolTables: !knockoutOnly && game.poolTables != null,
    showKnockoutTree: knockoutOnly && game.knockout != null,
    knockoutSectionTitle:
      groupsThenKnockout && game.knockout ? m.knockoutView.heading : null,
    notThrough,
  };
}

type RoundResultMatch = {
  roundNumber: number | null;
};

export function poolRoundGroups<T extends RoundResultMatch>(
  matches: readonly T[],
): { roundNumber: number; matches: T[] }[] {
  const groups = new Map<number, T[]>();
  for (const match of matches) {
    const round = match.roundNumber ?? 0;
    const list = groups.get(round) ?? [];
    list.push(match);
    groups.set(round, list);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([roundNumber, list]) => ({ roundNumber, matches: list }));
}

export type MatchTrailing =
  | { kind: "not_played"; label: string }
  | { kind: "score"; label: string }
  | { kind: "draw"; label: string }
  | { kind: "open"; label: string };

export function matchTrailing(args: {
  cancelled: boolean;
  scoreLabel: string | null;
  viewerOutcome?: "won" | "lost" | "draw" | null;
  locale: Locale;
}): MatchTrailing {
  const m = messagesFor(args.locale);
  if (args.cancelled) {
    return { kind: "not_played", label: m.tournament.details.notPlayed };
  }
  if (args.scoreLabel) {
    return { kind: "score", label: args.scoreLabel };
  }
  if (args.viewerOutcome === "draw") {
    return { kind: "draw", label: m.common.draw };
  }
  return { kind: "open", label: m.tournament.details.open };
}

export function viewerRoundSubtitle(
  roundNumber: number | null,
  startTime: Date | string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).tournament.details;
  const round = roundNumber != null ? m.roundN(roundNumber) : m.round;
  if (!startTime) {
    return round;
  }
  return m.roundDay(round, formatGameCardDay(startTime, locale));
}

export type KnockoutSideTags = {
  walkover: boolean;
  resultTag: string | null;
};

export function knockoutPlaceSideTags(
  place: Extract<KnockoutViewPlace, { kind: "match" }>,
  slot: 1 | 2,
  isFinal: boolean,
  locale: Locale,
): KnockoutSideTags {
  const m = messagesFor(locale).tournament.knockoutView;
  const winnerTag = isFinal ? m.champion : m.wonTag;
  return {
    walkover: place.walkover === slot,
    resultTag:
      place.winner === slot || (isFinal && place.walkover === slot)
        ? winnerTag
        : null,
  };
}

export function tournamentSeatLabel(args: {
  position: "left" | "right";
  teamLabel: string;
  joinable: boolean;
  locale: Locale;
}) {
  const m = messagesFor(args.locale).tournament;
  const position = m.position[`${args.position}Lower`];
  return args.joinable
    ? m.details.takeSeatOn(position, args.teamLabel)
    : m.details.openSeatOn(position, args.teamLabel);
}
