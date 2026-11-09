import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { challengeDaysLeft, proposalHoursLeft } from "./challenge-clock";
import {
  CHALLENGE_TIMINGS,
  CHALLENGE_WEEKDAYS,
  isChallengeTiming,
  isChallengeWeekday,
  type ChallengeWeekday,
} from "./challenge-form";
import { challengeCostLine } from "./challenge-game-details";
import {
  formatGameClock,
  formatGameClockWithoutMeridiem,
  formatGameDay,
  formatGameStart,
} from "./format-game-start";
import { initials } from "./initials";
import { displayLabelFromStoredBand } from "./level-bands";
import { tenthsToLevelBand } from "./level-range";
import { shortPlayerName } from "./player-name";
import { formatPricePerPlayerFils } from "./price-per-player";
import { sportLabel } from "./sport";
import { headToHeadLine, type HeadToHead } from "./team-rivals";

type Instant = Date | string;

const MS_PER_MINUTE = 60 * 1000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

const WEEKDAYS: readonly ChallengeWeekday[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
];
const WEEKEND: readonly ChallengeWeekday[] = ["sat", "sun"];

function instant(value: Instant) {
  return value instanceof Date ? value : new Date(value);
}

/** A Team as `challenges.byId` and `listProposeOptions` return its face. */
export type ChallengeTeamFace = {
  id: string;
  displayName: string;
  sport: string;
  rosterCount: number;
  teamLevel: { band: string } | null;
  members: readonly { name: string | null; isViewer: boolean }[];
};

function joinNames(names: readonly string[], locale: Locale) {
  const m = messagesFor(locale).challenge.detailScreen;
  if (names.length <= 1) {
    return names[0] ?? null;
  }
  const last = names[names.length - 1]!;
  return m.twoNames(names.slice(0, -1).join(m.nameSeparator), last);
}

/**
 * "C+, Khalid A and Mahmood S" on padel (the viewer reads "you", first);
 * "C. 12 on the roster" on football; "Padel, C+, you and Ali M" with the sport.
 */
export function challengeTeamFaceLine(
  face: ChallengeTeamFace,
  locale: Locale,
  options: { withSport?: boolean } = {},
) {
  const m = messagesFor(locale);
  const copy = m.challenge.detailScreen;
  const level = face.teamLevel?.band ?? null;
  let line: string;
  if (face.sport === "football") {
    const roster = m.team.onRoster(face.rosterCount);
    line = level ? copy.footballLine(level, roster) : roster;
  } else {
    const names = [...face.members]
      .sort((a, b) => Number(b.isViewer) - Number(a.isViewer))
      .map((member) =>
        member.isViewer
          ? copy.you
          : shortPlayerName(member.name ?? m.team.memberFallback),
      );
    const people = joinNames(names, locale);
    line =
      level && people ? copy.teamLine(level, people) : (people ?? level ?? "");
  }
  const sport = options.withSport ? sportLabel(face.sport, locale) : null;
  return sport ? copy.withSport(sport, line) : line;
}

/** One side of the team-vs-team box: crest initials, name and line. */
export function challengeTeamFaceView(face: ChallengeTeamFace, locale: Locale) {
  const line = challengeTeamFaceLine(face, locale);
  return {
    id: face.id,
    name: face.displayName,
    initials: initials(face.displayName),
    line,
    accessibilityLabel: line
      ? `${face.displayName}${messagesFor(locale).group.metaSeparator}${line}`
      : face.displayName,
  };
}

export type ChallengeTeamFaceView = ReturnType<typeof challengeTeamFaceView>;

/** "Open challenge, 5 days left", "Proposal sent, waiting for Riffa Rackets", "Confirmed, now a game". */
export function challengeDetailStatusLine(
  input: {
    state: "open" | "confirmed" | "expired" | "withdrawn";
    expiresAt: Instant;
    posterName: string;
    hasViewerProposal: boolean;
    gameCancelled: boolean;
  },
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge;
  const copy = m.detailScreen.status;
  switch (input.state) {
    case "confirmed":
      return input.gameCancelled ? m.detail.game.cancelled : copy.confirmed;
    case "expired":
    case "withdrawn":
      return m.detail.closed[input.state];
    case "open":
      return input.hasViewerProposal
        ? copy.proposalSent(input.posterName)
        : copy.open(challengeDaysLeft(input.expiresAt, now));
  }
}

function bandLabel(tenths: number) {
  return displayLabelFromStoredBand(tenthsToLevelBand(tenths));
}

/** "C to B−", "B and up", "Any level". */
export function challengeLevelValue(
  levelMinTenths: number | null,
  levelMaxTenths: number | null,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.detailScreen.level;
  const min = levelMinTenths == null ? null : bandLabel(levelMinTenths);
  const max = levelMaxTenths == null ? null : bandLabel(levelMaxTenths);
  if (min && max) {
    return min === max ? min : m.range(min, max);
  }
  if (min) {
    return m.andUp(min);
  }
  if (max) {
    return m.andUnder(max);
  }
  return m.any;
}

function sameSet(
  picked: readonly ChallengeWeekday[],
  set: readonly ChallengeWeekday[],
) {
  return (
    picked.length === set.length && set.every((day) => picked.includes(day))
  );
}

/** "Tue, Thu", "Weekdays", "Weekends", "Any day". */
export function challengeDaysValue(days: readonly string[], locale: Locale) {
  const m = messagesFor(locale).challenge;
  const picked = days.filter(isChallengeWeekday);
  if (picked.length === 0 || picked.length === CHALLENGE_WEEKDAYS.length) {
    return m.when.anyDay;
  }
  if (sameSet(picked, WEEKDAYS)) {
    return m.when.weekdays;
  }
  if (sameSet(picked, WEEKEND)) {
    return m.when.weekends;
  }
  return CHALLENGE_WEEKDAYS.filter((day) => picked.includes(day))
    .map((day) => m.weekdays[day])
    .join(m.when.listSeparator);
}

/** "Evenings, after 6 PM"; several timings list their names; none is "Any time". */
export function challengeTimingsValue(
  timings: readonly string[],
  locale: Locale,
) {
  const m = messagesFor(locale).challenge;
  const picked = CHALLENGE_TIMINGS.filter((timing) =>
    timings.filter(isChallengeTiming).includes(timing),
  );
  if (picked.length === 0 || picked.length === CHALLENGE_TIMINGS.length) {
    return m.when.anyTime;
  }
  if (picked.length === 1) {
    const timing = picked[0]!;
    return m.detailScreen.timingWithRange(
      m.timings[timing],
      m.detailScreen.timingRanges[timing],
    );
  }
  return picked.map((timing) => m.timings[timing]).join(m.when.listSeparator);
}

export type ChallengeDetailRow = {
  key:
    | "level"
    | "venues"
    | "days"
    | "timings"
    | "exactTimes"
    | "record"
    | "posted";
  label: string;
  value: string;
};

/** The open detail's list: Level wanted, Preferred venues, Days, Timings, Record, Posted. */
export function challengeDetailRows(
  input: {
    sport: string;
    levelMinTenths: number | null;
    levelMaxTenths: number | null;
    venues: readonly { name: string }[];
    days: readonly string[];
    timings: readonly string[];
    exactSlots: readonly Instant[];
    team: { displayName: string; record: HeadToHead };
    postedBy: { name: string | null };
    createdAt: Instant;
  },
  locale: Locale,
): ChallengeDetailRow[] {
  const m = messagesFor(locale);
  const copy = m.challenge.detailScreen;
  const exactSlots = [...input.exactSlots]
    .map(instant)
    .sort((a, b) => a.getTime() - b.getTime());
  const rows: (ChallengeDetailRow | null)[] = [
    {
      key: "level",
      label: copy.rows.level,
      value: challengeLevelValue(
        input.levelMinTenths,
        input.levelMaxTenths,
        locale,
      ),
    },
    {
      key: "venues",
      label: copy.rows.venues,
      value:
        input.venues.length === 0
          ? m.challenge.card.anyVenue
          : input.venues
              .map((venue) => venue.name)
              .join(m.challenge.when.listSeparator),
    },
    {
      key: "days",
      label: copy.rows.days,
      value: challengeDaysValue(input.days, locale),
    },
    {
      key: "timings",
      label: copy.rows.timings,
      value: challengeTimingsValue(input.timings, locale),
    },
    exactSlots.length > 0
      ? {
          key: "exactTimes",
          label: copy.rows.exactTimes,
          value: exactSlots
            .map((slot) => formatGameStart(slot, locale))
            .join(m.challenge.when.listSeparator),
        }
      : null,
    {
      key: "record",
      label: copy.rows.record,
      value: copy.recordValue(
        input.team.displayName,
        headToHeadLine(input.team.record, input.sport, locale),
      ),
    },
    {
      key: "posted",
      label: copy.rows.posted,
      value: copy.postedValue(
        formatGameDay(input.createdAt, locale, { weekday: "short" }),
        shortPlayerName(input.postedBy.name ?? m.team.memberFallback),
      ),
    },
  ];
  return rows.filter((row): row is ChallengeDetailRow => row != null);
}

/** "2 proposals so far" over "They pick one and confirm". */
export function challengeDetailFooter(proposalCount: number, locale: Locale) {
  const m = messagesFor(locale).challenge.detailScreen.footer;
  return { title: m.proposals(proposalCount), hint: m.hint };
}

/** "just now", "12m ago", "2h ago", "3 days ago". */
export function challengeAgoLine(at: Instant, now: Date, locale: Locale) {
  const m = messagesFor(locale).challenge.detailScreen.ago;
  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - instant(at).getTime()) / MS_PER_MINUTE),
  );
  if (minutes < 1) {
    return m.justNow;
  }
  if (minutes < MINUTES_PER_HOUR) {
    return m.minutes(minutes);
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) {
    return m.hours(hours);
  }
  return m.days(Math.floor(hours / HOURS_PER_DAY));
}

export type ChallengeProposalCardInput = {
  startsAt: Instant;
  venue: { name: string };
  court: { name: string } | null;
  pricePerPlayerFils: number | null;
  expiresAt: Instant;
  sentAt: Instant;
  team: { displayName: string };
};

/**
 * A pending Proposal as a card. The proposing side reads "Your proposal,
 * waiting for Riffa Rackets" and "They have 46 hours to confirm"; the poster
 * reads the proposing Team and "You have …".
 */
export function challengeProposalCard(
  proposal: ChallengeProposalCardInput,
  args: { side: "proposer" | "poster"; posterName: string },
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge;
  const copy = m.detailScreen.proposal;
  const hours = proposalHoursLeft(proposal.expiresAt, now);
  const title =
    args.side === "proposer"
      ? copy.waiting(args.posterName)
      : proposal.team.displayName;
  const subline = copy.lines(
    copy.sent(challengeAgoLine(proposal.sentAt, now, locale)),
    args.side === "proposer" ? copy.theyHave(hours) : copy.youHave(hours),
  );
  const timeValue = formatGameStart(proposal.startsAt, locale);
  const venueValue = proposal.court
    ? m.proposal.at(proposal.venue.name, proposal.court.name)
    : proposal.venue.name;
  const priceValue =
    proposal.pricePerPlayerFils == null
      ? null
      : proposal.pricePerPlayerFils === 0
        ? formatPricePerPlayerFils(0, locale)
        : m.proposal.price(
            formatPricePerPlayerFils(proposal.pricePerPlayerFils, locale) ?? "",
          );
  return {
    title,
    subline,
    timeLabel: copy.time,
    timeValue,
    venueLabel: copy.venue,
    venueValue,
    priceLabel: copy.price,
    priceValue,
    accessibilityLabel: [title, subline, timeValue, venueValue, priceValue]
      .filter((part): part is string => part != null)
      .join(m.when.listSeparator),
  };
}

export type ChallengeProposalCardView = ReturnType<
  typeof challengeProposalCard
>;

export function challengeProposalFootnote(sport: string, locale: Locale) {
  const m = messagesFor(locale).challenge.detailScreen.proposal.footnote;
  return sport === "football" ? m.football : m.padel;
}

export type ChallengeConfirmedInput = {
  sport: string;
  startsAt: Instant;
  endsAt: Instant | null;
  cancelled: boolean;
  venue: { name: string };
  court: { name: string } | null;
  pricePerPlayerFils: number | null;
  proposedBy: { name: string | null; isViewer: boolean };
  confirmedBy: { name: string | null };
  confirmedAt: Instant | null;
};

/**
 * The confirmed head and rows: "8:00" and "PM", "Thu 12 Nov, Padel Point
 * Riffa", "Court 2, 90 min"; Proposed by, Confirmed by, Court and Cost.
 */
export function challengeConfirmedView(
  game: ChallengeConfirmedInput,
  teams: { proposer: string; poster: string },
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const copy = m.challenge.detailScreen.confirmed;
  const fallback = m.team.memberFallback;
  const clock = formatGameClock(game.startsAt, locale);
  const time = formatGameClockWithoutMeridiem(game.startsAt, locale);
  const meridiem = clock.slice(time.length).trim();
  const minutes = game.endsAt
    ? Math.round(
        (instant(game.endsAt).getTime() - instant(game.startsAt).getTime()) /
          MS_PER_MINUTE,
      )
    : null;
  const duration = minutes && minutes > 0 ? copy.duration(minutes) : null;
  const placeLine =
    game.court && duration
      ? copy.placeFor(game.court.name, duration)
      : (game.court?.name ?? duration);
  const place = game.court
    ? m.challenge.detail.game.place(game.venue.name, game.court.name)
    : game.venue.name;
  const proposer = game.proposedBy.isViewer
    ? copy.you
    : shortPlayerName(game.proposedBy.name ?? fallback);
  const confirmer = shortPlayerName(game.confirmedBy.name ?? fallback);
  return {
    statusLine: game.cancelled
      ? m.challenge.detail.game.cancelled
      : m.challenge.detailScreen.status.confirmed,
    time,
    meridiem: meridiem.length > 0 ? meridiem : null,
    dayLine: copy.dayAt(
      formatGameDay(game.startsAt, locale, { weekday: "short" }),
      game.venue.name,
    ),
    placeLine,
    rows: [
      {
        key: "proposed",
        label: copy.proposedBy,
        value: copy.byTeam(proposer, teams.proposer),
      },
      {
        key: "confirmed",
        label: copy.confirmedBy,
        value: game.confirmedAt
          ? copy.byTeamAgo(
              confirmer,
              teams.poster,
              challengeAgoLine(game.confirmedAt, now, locale),
            )
          : copy.byTeam(confirmer, teams.poster),
      },
      {
        key: "place",
        label:
          game.sport === "football"
            ? m.challenge.detail.game.pitch
            : m.challenge.detail.game.court,
        value: copy.bookIt(place),
      },
      {
        key: "cost",
        label: m.challenge.detail.game.cost,
        value: challengeCostLine(
          { sport: game.sport, pricePerPlayerFils: game.pricePerPlayerFils },
          locale,
        ),
      },
    ],
    closedNote: copy.closedNote,
  };
}
