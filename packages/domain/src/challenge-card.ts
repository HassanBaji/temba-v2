import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { challengeDaysLeft, proposalExpiresLine } from "./challenge-clock";
import { challengeCostLine } from "./challenge-game-details";
import {
  CHALLENGE_TIMINGS,
  CHALLENGE_WEEKDAYS,
  isChallengeTiming,
  isChallengeWeekday,
  type ChallengeTiming,
  type ChallengeWeekday,
} from "./challenge-form";
import { formatOvr } from "./football-ovr";
import { formatGameDay, formatGameStart } from "./format-game-start";
import { sideSizeLabel } from "./game-shape";
import {
  ASSIGNABLE_DISPLAY_LEVEL_BANDS,
  displayLabelFromStoredBand,
  type AssignableDisplayLevelBand,
} from "./level-bands";
import { parseLevelBandSelectTenths, tenthsToLevelBand } from "./level-range";
import { squadCounterLine, type SquadState } from "./matchday-squad";
import { formatPricePerPlayerFils } from "./price-per-player";
import { SPORTS, sportLabel, type Sport } from "./sport";
import { teamRosterRule } from "./team-roster";

/** Why a viewer cannot propose on a Challenge; the card greys and says so. */
export const CHALLENGE_INELIGIBLE_REASONS = [
  "no_team",
  "own",
  "padel_incomplete",
  "roster_short",
  "no_level",
  "level_outside",
  "shares_member",
] as const;

export type ChallengeIneligibleReason =
  (typeof CHALLENGE_INELIGIBLE_REASONS)[number];

/** The poster's first six Roster members show as initials tiles. */
export const CHALLENGE_CARD_TILES = 6;

const WEEKDAYS: readonly ChallengeWeekday[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
];
const WEEKEND: readonly ChallengeWeekday[] = ["sat", "sun"];

export type ChallengeCardInput = {
  id: string;
  sport: Sport;
  sideSize: number | null;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  days: readonly string[];
  timings: readonly string[];
  exactSlots: readonly (Date | string)[];
  venues: readonly { name: string }[];
  note: string | null;
  proposalCount: number;
  expiresAt: Date | string;
  team: {
    displayName: string;
    rosterCount: number;
    teamLevel: { level: string; band?: string; ovr?: number | null } | null;
    members: readonly { name: string | null }[];
  };
  viewer: { ineligibleReason: ChallengeIneligibleReason | null };
  /** A Rematch: the Team it was sent straight to. */
  nudgedTeam?: { displayName: string } | null;
  viewerTeamIsNudged?: boolean;
};

function bandLabel(tenths: number) {
  return displayLabelFromStoredBand(tenthsToLevelBand(tenths));
}

/** "Wants C to B-", "Wants B and up", or "Open to any level". */
export function challengeLevelWanted(
  levelMinTenths: number | null,
  levelMaxTenths: number | null,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.card;
  const min = levelMinTenths == null ? null : bandLabel(levelMinTenths);
  const max = levelMaxTenths == null ? null : bandLabel(levelMaxTenths);
  if (min && max) {
    return min === max ? m.wantsOnly(min) : m.wants(min, max);
  }
  if (min) {
    return m.wantsAndUp(min);
  }
  if (max) {
    return m.wantsAndUnder(max);
  }
  return m.anyLevel;
}

/** "avg 2.8", or "avg OVR 72" for a football Team. */
function teamAverage(
  level: { level: string; ovr?: number | null },
  locale: Locale,
) {
  const m = messagesFor(locale);
  return level.ovr == null
    ? m.challenge.card.avg(level.level)
    : m.rating.ovr.avg(formatOvr(level.ovr));
}

/**
 * "Football, 6-a-side, avg OVR 72, 12 on the roster. Wants C to B-". The board
 * leaves the Roster count out; the post form's review keeps it.
 */
export function challengeSportLine(
  input: Pick<
    ChallengeCardInput,
    "sport" | "sideSize" | "levelMinTenths" | "levelMaxTenths" | "team"
  >,
  locale: Locale,
  withRoster = true,
) {
  const m = messagesFor(locale);
  const football = input.sport === "football";
  const parts = [
    sportLabel(input.sport, locale),
    football && input.sideSize != null
      ? sideSizeLabel(input.sideSize, locale)
      : null,
    input.team.teamLevel ? teamAverage(input.team.teamLevel, locale) : null,
    football && withRoster ? m.team.onRoster(input.team.rosterCount) : null,
  ].filter((part): part is string => part != null);
  return m.challenge.card.sportLine(
    parts.join(m.challenge.card.partSeparator),
    challengeLevelWanted(input.levelMinTenths, input.levelMaxTenths, locale),
  );
}

function sameSet(
  picked: readonly ChallengeWeekday[],
  set: readonly ChallengeWeekday[],
) {
  return (
    picked.length === set.length && set.every((day) => picked.includes(day))
  );
}

function daysLabel(days: readonly ChallengeWeekday[], locale: Locale) {
  const m = messagesFor(locale).challenge;
  if (days.length === 0 || days.length === CHALLENGE_WEEKDAYS.length) {
    return m.when.anyDay;
  }
  if (sameSet(days, WEEKDAYS)) {
    return m.when.weekdays;
  }
  if (sameSet(days, WEEKEND)) {
    return m.when.weekends;
  }
  return CHALLENGE_WEEKDAYS.filter((day) => days.includes(day))
    .map((day) => m.weekdays[day])
    .join(m.when.listSeparator);
}

function timingsLabel(timings: readonly ChallengeTiming[], locale: Locale) {
  const m = messagesFor(locale).challenge;
  if (timings.length === 0 || timings.length === CHALLENGE_TIMINGS.length) {
    return m.when.anyTime;
  }
  return CHALLENGE_TIMINGS.filter((timing) => timings.includes(timing))
    .map((timing) => m.timings[timing])
    .join(m.when.listSeparator);
}

/** "Weekends · Evenings", "Any day · Any time". */
export function challengeWhenLine(
  days: readonly string[],
  timings: readonly string[],
  locale: Locale,
) {
  return messagesFor(locale).challenge.when.line(
    daysLabel(days.filter(isChallengeWeekday), locale),
    timingsLabel(timings.filter(isChallengeTiming), locale),
  );
}

/** The card's days line: "Tue, Thu evenings", "Weekend mornings", "Weekdays", "Evenings". */
export function challengeDaysLine(
  days: readonly string[],
  timings: readonly string[],
  locale: Locale,
) {
  const m = messagesFor(locale).challenge;
  const pickedDays = days.filter(isChallengeWeekday);
  const pickedTimings = timings.filter(isChallengeTiming);
  const anyDay =
    pickedDays.length === 0 || pickedDays.length === CHALLENGE_WEEKDAYS.length;
  const anyTime =
    pickedTimings.length === 0 ||
    pickedTimings.length === CHALLENGE_TIMINGS.length;
  if (anyTime) {
    return anyDay
      ? m.when.line(m.when.anyDay, m.when.anyTime)
      : daysLabel(pickedDays, locale);
  }
  if (anyDay) {
    return timingsLabel(pickedTimings, locale);
  }
  const dayPart = sameSet(pickedDays, WEEKDAYS)
    ? m.tab.days.weekdays
    : sameSet(pickedDays, WEEKEND)
      ? m.tab.days.weekends
      : daysLabel(pickedDays, locale);
  const timingPart = CHALLENGE_TIMINGS.filter((timing) =>
    pickedTimings.includes(timing),
  )
    .map((timing) => m.tab.days.timings[timing])
    .join(m.when.listSeparator);
  return m.tab.days.line(dayPart, timingPart);
}

/** "Or Fri 14 Nov, 7:00 PM", or null without exact slots. */
export function challengeSlotsLine(
  exactSlots: readonly (Date | string)[],
  locale: Locale,
) {
  if (exactSlots.length === 0) {
    return null;
  }
  const m = messagesFor(locale).challenge.when;
  return m.slots(
    [...exactSlots]
      .map((slot) => (slot instanceof Date ? slot : new Date(slot)))
      .sort((a, b) => a.getTime() - b.getTime())
      .map((slot) => formatGameStart(slot, locale))
      .join(m.listSeparator),
  );
}

export function challengeVenuesLine(
  venues: readonly { name: string }[],
  locale: Locale,
) {
  const m = messagesFor(locale).challenge;
  return venues.length === 0
    ? m.card.anyVenue
    : venues.map((venue) => venue.name).join(m.when.listSeparator);
}

/** "2 proposals, 5 days left". */
export function challengeProposalsLine(
  proposalCount: number,
  expiresAt: Date | string,
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.card;
  return m.proposalsLine(
    m.proposals(proposalCount),
    m.daysLeft(challengeDaysLeft(expiresAt, now)),
  );
}

export function challengeIneligibleLine(
  reason: ChallengeIneligibleReason,
  challenge: Pick<ChallengeCardInput, "sport" | "sideSize">,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.ineligible;
  switch (reason) {
    case "no_team":
      return m.noTeam[challenge.sport];
    case "own":
      return m.own;
    case "padel_incomplete":
      return m.padelIncomplete;
    case "roster_short":
      return m.rosterShort(
        sideSizeLabel(
          challenge.sideSize ?? teamRosterRule(challenge.sport).completeAt,
          locale,
        ),
      );
    case "no_level":
      return m.noLevel;
    case "level_outside":
      return m.levelOutside;
    case "shares_member":
      return m.sharesMember;
  }
}

/** Whether the viewer may press Accept: an eligible Team, or none yet (the detail asks for one). */
function canAccept(reason: ChallengeIneligibleReason | null) {
  return reason == null || reason === "no_team";
}

export type ChallengeCardOptions = {
  /** The post form's review: the Roster count stays, "Open for 7 days", Accept inert. */
  preview?: boolean;
};

/** One Challenge on the Open board, and the open state of its detail. */
export function challengeCardView(
  input: ChallengeCardInput,
  locale: Locale,
  now: Date,
  options: ChallengeCardOptions = {},
) {
  const preview = options.preview === true;
  const m = messagesFor(locale);
  const reason = input.viewer.ineligibleReason;
  const tiles = input.team.members
    .slice(0, CHALLENGE_CARD_TILES)
    .map((member, index) => ({
      key: `member-${index}`,
      name: member.name ?? m.team.memberFallback,
    }));
  const side =
    input.sport === "football"
      ? (input.sideSize ?? teamRosterRule("football").completeAt)
      : teamRosterRule("padel").max;
  const sportLine = challengeSportLine(input, locale, preview);
  const whenLine = challengeWhenLine(input.days, input.timings, locale);
  const daysLine = challengeDaysLine(input.days, input.timings, locale);
  const slotsLine = challengeSlotsLine(input.exactSlots, locale);
  const venuesLine = challengeVenuesLine(input.venues, locale);
  const proposalsLine = challengeProposalsLine(
    input.proposalCount,
    input.expiresAt,
    now,
    locale,
  );
  const greyedLine = reason
    ? challengeIneligibleLine(reason, input, locale)
    : null;
  const nudgeLine =
    input.viewerTeamIsNudged && input.nudgedTeam
      ? m.challenge.card.nudged(input.nudgedTeam.displayName)
      : null;
  const footerLine = preview
    ? m.challenge.tab.openFor(challengeDaysLeft(input.expiresAt, now))
    : proposalsLine;
  return {
    id: input.id,
    sport: input.sport,
    title: input.team.displayName,
    levelBand: input.team.teamLevel?.band ?? null,
    sportLine,
    whenLine,
    daysLine,
    slotsLine,
    venuesLine,
    note: input.note,
    proposalsLine,
    footerLine,
    preview,
    canAccept: !preview && canAccept(reason),
    tiles,
    opponentSeats: Math.min(side, CHALLENGE_CARD_TILES),
    opponentSeatsLabel: m.challenge.card.opponentSeats,
    greyed: reason != null && reason !== "own",
    greyedLine,
    nudgeLine,
    accessibilityLabel: [
      m.challenge.card.open(input.team.displayName),
      nudgeLine,
      sportLine,
      daysLine,
      slotsLine,
      venuesLine,
      footerLine,
      greyedLine,
    ]
      .filter((part): part is string => part != null)
      .join(m.group.metaSeparator),
  };
}

export type ChallengeCardView = ReturnType<typeof challengeCardView>;

export type ChallengeBoardFilters = {
  sport: Sport | null;
  level: AssignableDisplayLevelBand | null;
  area: string | null;
  day: ChallengeWeekday | null;
};

export const NO_CHALLENGE_BOARD_FILTERS: ChallengeBoardFilters = {
  sport: null,
  level: null,
  area: null,
  day: null,
};

/** The `challenges.listOpen` input for the picked filters; a Level band asks for its tenths. */
export function challengeBoardQuery(filters: ChallengeBoardFilters) {
  return {
    ...(filters.sport ? { sport: filters.sport } : {}),
    ...(filters.level
      ? {
          levelMinTenths:
            parseLevelBandSelectTenths(filters.level, "min") ?? undefined,
          levelMaxTenths:
            parseLevelBandSelectTenths(filters.level, "max") ?? undefined,
        }
      : {}),
    ...(filters.area ? { area: filters.area } : {}),
    ...(filters.day ? { weekday: filters.day } : {}),
  };
}

export type ChallengeBoardFilterKey = keyof ChallengeBoardFilters;

/** Sport, Level, Area and Day, each with Any first. */
export function challengeBoardFilterGroups(
  filters: ChallengeBoardFilters,
  areas: readonly string[],
  locale: Locale,
) {
  const m = messagesFor(locale).challenge;
  const group = <T extends string>(
    key: ChallengeBoardFilterKey,
    label: string,
    options: { value: T; label: string }[],
  ) => {
    const selected = filters[key];
    const anyLabel = key === "sport" ? m.tab.filterAll : m.filters.any;
    const any = { value: null, label: anyLabel };
    return {
      key,
      label,
      summary:
        options.find((option) => option.value === selected)?.label ?? anyLabel,
      options: [any, ...options].map((option) => ({
        ...option,
        selected: option.value === selected,
      })),
    };
  };
  return [
    group(
      "sport",
      m.filters.sport,
      SPORTS.map((sport) => ({
        value: sport,
        label: sportLabel(sport, locale) ?? sport,
      })),
    ),
    group(
      "level",
      m.filters.level,
      ASSIGNABLE_DISPLAY_LEVEL_BANDS.map((band) => ({
        value: band,
        label: band,
      })),
    ),
    group(
      "area",
      m.filters.area,
      areas.map((area) => ({ value: area, label: area })),
    ),
    group(
      "day",
      m.filters.day,
      CHALLENGE_WEEKDAYS.map((day) => ({ value: day, label: m.weekdays[day] })),
    ),
  ];
}

export function challengeBoardHasFilters(filters: ChallengeBoardFilters) {
  return Object.values(filters).some((value) => value != null);
}

export type ChallengeProposalInput = {
  startsAt: Date | string;
  venue: { name: string };
  court: { name: string } | null;
  pricePerPlayerFils: number | null;
  expiresAt: Date | string;
  sentAt: Date | string;
  team: { displayName: string };
};

/** A Proposal's lines: "Sat 14 Nov, 7:00 PM", "Padel Central, Court 2", "1.500 BD each", "Expires in 22h". */
export function challengeProposalView(
  input: ChallengeProposalInput,
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const whenLine = formatGameStart(input.startsAt, locale);
  const whereLine = input.court
    ? m.challenge.proposal.at(input.venue.name, input.court.name)
    : input.venue.name;
  const priceLine =
    input.pricePerPlayerFils == null
      ? null
      : input.pricePerPlayerFils === 0
        ? formatPricePerPlayerFils(0, locale)
        : m.challenge.proposal.price(
            formatPricePerPlayerFils(input.pricePerPlayerFils, locale) ?? "",
          );
  const expiresLine = proposalExpiresLine(input.expiresAt, now, locale);
  const sentLine = m.challenge.proposal.sent(
    formatGameDay(input.sentAt, locale, { weekday: "short" }),
  );
  return {
    title: input.team.displayName,
    whenLine,
    whereLine,
    priceLine,
    expiresLine,
    sentLine,
    accessibilityLabel: [
      input.team.displayName,
      whenLine,
      whereLine,
      priceLine,
      expiresLine,
    ]
      .filter((part): part is string => part != null)
      .join(m.group.metaSeparator),
  };
}

export type ChallengeProposalView = ReturnType<typeof challengeProposalView>;

export type ChallengeGameInput = {
  sport: string;
  startsAt: Date | string;
  cancelled: boolean;
  venue: { name: string };
  court: { name: string } | null;
  pricePerPlayerFils: number | null;
  proposedBy: { name: string | null };
  confirmedBy: { name: string | null };
  sides: {
    displayName: string | null;
    sideSize: number;
    namedCount: number;
    squadState: SquadState;
  }[];
};

/**
 * The confirmed Challenge's Game: kick-off, "Pitch" or "Court" with "Book it
 * yourselves", the cost each ("Split four ways" on padel without a price),
 * who proposed and confirmed, and on football each squad's counter.
 */
export function challengeGameView(input: ChallengeGameInput, locale: Locale) {
  const m = messagesFor(locale).challenge.detail.game;
  const football = input.sport === "football";
  const place = input.court
    ? m.place(input.venue.name, input.court.name)
    : input.venue.name;
  const costLine = challengeCostLine(input, locale);
  const fallback = messagesFor(locale).team.memberFallback;
  return {
    whenLine: formatGameStart(input.startsAt, locale),
    placeLabel: football ? m.pitch : m.court,
    placeLine: place,
    bookLine: m.bookYourselves,
    costLine,
    decidedLine: m.proposedConfirmed(
      input.proposedBy.name ?? fallback,
      input.confirmedBy.name ?? fallback,
    ),
    squads: football
      ? input.sides.map((side) => ({
          title: side.displayName ?? fallback,
          counter: squadCounterLine(side.namedCount, side.sideSize, locale),
        }))
      : [],
    cancelledLine: input.cancelled ? m.cancelled : null,
  };
}
