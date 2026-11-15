import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatGameClock, formatWeekday } from "./format-game-start";
import { organizerRequestLevel } from "./game-requests";
import type { Sport } from "./sport";

export type WaitingRequestUser = {
  id: string;
  name: string | null;
  image: string | null;
};

export type WaitingRequestGame = {
  id: string;
  sport: Sport;
  startsAt: Date | string | null;
  groupId: string | null;
  groupName: string | null;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  registeredCount: number;
  capacity: number;
};

type WaitingRequestBase = {
  id: string;
  createdAt: Date | string;
  user: WaitingRequestUser;
  levelTenths: number | null;
};

/**
 * A request waiting on the viewer as an Organizer or Group approver: a Game
 * Level range request, a Group join request with a live Seat hold, or a Group
 * join request without one. Home, Notifications and All requests read it as
 * one card.
 */
export type WaitingRequest =
  | (WaitingRequestBase & {
      kind: "level_range";
      game: WaitingRequestGame;
      requesterInGroup: boolean;
      /** They picked a seat while asking, so approval seats them; without one it only waives the Level range. */
      pickedSeat: boolean;
    })
  | (WaitingRequestBase & {
      kind: "seat_hold";
      game: WaitingRequestGame;
      seatHeldUntil: Date | string;
      group: { id: string; name: string | null };
      invitedBy: { id: string; name: string | null } | null;
      invitedByViewer: boolean;
    })
  | (WaitingRequestBase & {
      kind: "group_join";
      group: { id: string; name: string | null; sport: Sport };
      source: "invite_link" | "group_page" | null;
      invitedBy: { id: string; name: string | null } | null;
      invitedByViewer: boolean;
      note: string | null;
      gamesWithMembers: number;
    });

export type WaitingRequestKind = WaitingRequest["kind"];

export type RequestDecision = "approve" | "decline";

const MS_PER_MINUTE = 60 * 1000;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

function millisOf(value: Date | string) {
  return new Date(value).getTime();
}

export function isSeatRequest(
  request: WaitingRequest,
): request is Extract<WaitingRequest, { game: WaitingRequestGame }> {
  return request.kind !== "group_join";
}

export function waitingRequestSport(request: WaitingRequest): Sport {
  return isSeatRequest(request) ? request.game.sport : request.group.sport;
}

/** What runs out first: the Seat hold, or the Game's start. None for a Group join request. */
export function waitingRequestDeadline(request: WaitingRequest): number | null {
  if (request.kind === "seat_hold") {
    return millisOf(request.seatHeldUntil);
  }
  if (request.kind === "level_range" && request.game.startsAt) {
    return millisOf(request.game.startsAt);
  }
  return null;
}

/** Most urgent first: seats before Group join requests, then whichever runs out first, then the oldest ask. */
export function compareWaitingRequests(a: WaitingRequest, b: WaitingRequest) {
  const seatOrder = Number(!isSeatRequest(a)) - Number(!isSeatRequest(b));
  if (seatOrder !== 0) {
    return seatOrder;
  }
  const aDeadline = waitingRequestDeadline(a) ?? Number.POSITIVE_INFINITY;
  const bDeadline = waitingRequestDeadline(b) ?? Number.POSITIVE_INFINITY;
  if (aDeadline !== bDeadline) {
    return aDeadline < bDeadline ? -1 : 1;
  }
  return (
    millisOf(a.createdAt) - millisOf(b.createdAt) || a.id.localeCompare(b.id)
  );
}

export function sortWaitingRequests(
  requests: readonly WaitingRequest[],
): WaitingRequest[] {
  return [...requests].sort(compareWaitingRequests);
}

/** `52` for football (OVR), `C+` for padel (Level band). */
export function waitingRequestLevelLabel(
  tenths: number | null,
  sport: Sport,
): string | null {
  return organizerRequestLevel(tenths, sport);
}

/** `55 to 75` for football, `C- to C` for padel; null when the Game has no range. */
function rangeLabel(game: WaitingRequestGame, locale: Locale): string | null {
  const m = messagesFor(locale).level;
  const min = waitingRequestLevelLabel(game.levelMinTenths, game.sport);
  const max = waitingRequestLevelLabel(game.levelMaxTenths, game.sport);
  if (min && max) {
    return min === max ? min : m.range(min, max);
  }
  if (min) {
    return m.andUp(min);
  }
  if (max) {
    return m.andUnder(max);
  }
  return null;
}

function nonBlank(text: string | null | undefined) {
  const trimmed = text?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function nameOf(user: WaitingRequestUser, locale: Locale) {
  return nonBlank(user.name) ?? messagesFor(locale).requests.userFallback;
}

function groupNameOf(name: string | null | undefined, locale: Locale) {
  return nonBlank(name) ?? messagesFor(locale).requests.groupFallback;
}

/** `Seat in Fri 7:00 PM football` or `Join Tuesday Night Padel`. */
export function waitingRequestWant(request: WaitingRequest, locale: Locale) {
  const m = messagesFor(locale).requests;
  if (!isSeatRequest(request)) {
    return m.want.group(groupNameOf(request.group.name, locale));
  }
  const sport = m.sportNoun[request.game.sport];
  const startsAt = request.game.startsAt;
  return startsAt
    ? m.want.seat(
        formatWeekday(startsAt, "short", locale),
        formatGameClock(startsAt, locale),
        sport,
      )
    : m.want.seatNoTime(sport);
}

function levelSentence(
  request: Extract<WaitingRequest, { kind: "level_range" }>,
  locale: Locale,
) {
  const m = messagesFor(locale).requests.context;
  const { game } = request;
  const range = rangeLabel(game, locale);
  if (!range) {
    return m.outsideNoRange;
  }
  const level = waitingRequestLevelLabel(request.levelTenths, game.sport);
  if (request.levelTenths == null || !level) {
    return m.noLevel(range);
  }
  if (
    game.levelMinTenths != null &&
    request.levelTenths < game.levelMinTenths
  ) {
    return m.under(level, range);
  }
  if (
    game.levelMaxTenths != null &&
    request.levelTenths > game.levelMaxTenths
  ) {
    return m.above(level, range);
  }
  return m.inside(level, range);
}

function linkSentence(
  request: Extract<WaitingRequest, { kind: "group_join" }>,
  locale: Locale,
) {
  const m = messagesFor(locale).requests.context;
  if (request.source === "group_page") {
    return m.groupPage;
  }
  if (request.invitedByViewer) {
    return m.yourLink;
  }
  if (request.invitedBy?.name) {
    return m.invitedBy(request.invitedBy.name);
  }
  return request.source === "invite_link" ? m.inviteLink : null;
}

/** Why it reached the viewer, and what Approve does beyond the obvious. */
export function waitingRequestContext(request: WaitingRequest, locale: Locale) {
  const m = messagesFor(locale).requests.context;
  if (request.kind === "level_range") {
    const member =
      request.requesterInGroup && request.game.groupName
        ? m.member(request.game.groupName)
        : null;
    return [member, levelSentence(request, locale)]
      .filter((part) => part != null)
      .join(" ");
  }
  if (request.kind === "seat_hold") {
    const group = groupNameOf(request.group.name, locale);
    const how = request.invitedByViewer
      ? m.notInGroupYourLink(group)
      : request.invitedBy?.name
        ? m.notInGroupLinkFrom(group, request.invitedBy.name)
        : m.notInGroupLink(group);
    return `${how} ${m.addsToGroup}`;
  }
  const games =
    request.gamesWithMembers > 0
      ? m.gamesWithMembers(request.gamesWithMembers)
      : m.noGamesWithMembers;
  return [linkSentence(request, locale), games]
    .filter((part) => part != null)
    .join(" ");
}

function minutesBetween(from: number, to: number) {
  return Math.floor((to - from) / MS_PER_MINUTE);
}

type DurationForms = {
  minutes: (n: number) => string;
  hours: (n: number) => string;
  days: (n: number) => string;
};

function durationLabel(minutes: number, forms: DurationForms) {
  if (minutes < MINUTES_PER_HOUR) {
    return forms.minutes(Math.max(1, minutes));
  }
  if (minutes < MINUTES_PER_DAY) {
    return forms.hours(Math.floor(minutes / MINUTES_PER_HOUR));
  }
  return forms.days(Math.floor(minutes / MINUTES_PER_DAY));
}

/** What is running out: `seat held 6h left`, `starts in 2d`, or `asked 2d ago`. */
export function waitingRequestClock(
  request: WaitingRequest,
  locale: Locale,
  now: Date = new Date(),
): { label: string; value: string } {
  const m = messagesFor(locale).requests.time;
  const nowMs = now.getTime();
  if (request.kind === "seat_hold") {
    return {
      label: m.seatHeld,
      value: durationLabel(
        minutesBetween(nowMs, millisOf(request.seatHeldUntil)),
        { minutes: m.minutesLeft, hours: m.hoursLeft, days: m.daysLeft },
      ),
    };
  }
  if (request.kind === "level_range" && request.game.startsAt) {
    return {
      label: m.starts,
      value: durationLabel(
        minutesBetween(nowMs, millisOf(request.game.startsAt)),
        { minutes: m.inMinutes, hours: m.inHours, days: m.inDays },
      ),
    };
  }
  const askedMinutesAgo = minutesBetween(millisOf(request.createdAt), nowMs);
  return {
    label: m.asked,
    value:
      askedMinutesAgo < 1
        ? m.justNow
        : durationLabel(askedMinutesAgo, {
            minutes: m.minutesAgo,
            hours: m.hoursAgo,
            days: m.daysAgo,
          }),
  };
}

export type WaitingRequestCard = {
  id: string;
  kind: WaitingRequestKind;
  name: string;
  image: string | null;
  sport: Sport;
  level: string | null;
  want: string;
  wantIcon: "seat" | "group";
  context: string;
  note: string | null;
  clock: { label: string; value: string };
};

function noteOf(request: WaitingRequest, locale: Locale) {
  const note = request.kind === "group_join" ? nonBlank(request.note) : null;
  return note ? messagesFor(locale).requests.context.note(note) : null;
}

export function waitingRequestCard(
  request: WaitingRequest,
  locale: Locale,
  now: Date = new Date(),
): WaitingRequestCard {
  const sport = waitingRequestSport(request);
  return {
    id: request.id,
    kind: request.kind,
    name: nameOf(request.user, locale),
    image: request.user.image,
    sport,
    level: waitingRequestLevelLabel(request.levelTenths, sport),
    want: waitingRequestWant(request, locale),
    wantIcon: isSeatRequest(request) ? "seat" : "group",
    context: waitingRequestContext(request, locale),
    note: noteOf(request, locale),
    clock: waitingRequestClock(request, locale, now),
  };
}

/** What approving did, or will do, about a seat: null when it seats nobody. */
export type SeatOutcome = "registered" | "waitlisted" | "lapsed" | null;

/** Approval seats the requester: a Seat hold, or a Level range request whose asker picked a seat. */
export function approvalSeats(request: WaitingRequest) {
  return (
    request.kind === "seat_hold" ||
    (request.kind === "level_range" && request.pickedSeat)
  );
}

/** The seat approval is expected to give, read from how full the Game is, until the door says what it gave. */
export function expectedSeatOutcome(request: WaitingRequest): SeatOutcome {
  if (!isSeatRequest(request) || !approvalSeats(request)) {
    return null;
  }
  return request.game.registeredCount >= request.game.capacity
    ? "waitlisted"
    : "registered";
}

function approvedSeatText(
  request: Extract<WaitingRequest, { game: WaitingRequestGame }>,
  outcome: SeatOutcome,
  locale: Locale,
) {
  const m = messagesFor(locale).requests.done;
  const { startsAt } = request.game;
  const weekday = startsAt ? formatWeekday(startsAt, "long", locale) : null;
  const seated = outcome === "registered" || outcome === "waitlisted";
  if (request.kind === "seat_hold") {
    if (!seated || !weekday) {
      return m.inGroup(groupNameOf(request.group.name, locale));
    }
    return outcome === "registered"
      ? m.inGameAndGroup(weekday)
      : m.onWaitlistAndGroup(weekday);
  }
  if (outcome === "registered") {
    return weekday ? m.inGame(weekday) : m.inTheGame;
  }
  if (outcome === "waitlisted") {
    return weekday ? m.onWaitlist(weekday) : m.onTheWaitlist;
  }
  return weekday ? m.canJoin(weekday) : m.canJoinGame;
}

/**
 * The line an answered request leaves behind, after the name: `is in Friday’s
 * game`, `can now join Friday’s game`, `declined, seat freed`. `outcome` is
 * what the door said it did; until it is known the line says what is expected.
 */
export function waitingRequestDoneText(
  request: WaitingRequest,
  decision: RequestDecision,
  locale: Locale,
  outcome: SeatOutcome | undefined = undefined,
) {
  const m = messagesFor(locale).requests.done;
  if (decision === "decline") {
    return request.kind === "seat_hold" ? m.declinedSeatFreed : m.declined;
  }
  if (!isSeatRequest(request)) {
    return m.inGroup(groupNameOf(request.group.name, locale));
  }
  return approvedSeatText(
    request,
    outcome === undefined ? expectedSeatOutcome(request) : outcome,
    locale,
  );
}

/** `5 waiting`, or `All answered` once none is. */
export function waitingCountLabel(count: number, locale: Locale) {
  const m = messagesFor(locale).requests;
  return count > 0 ? m.waiting(count) : m.allAnswered;
}

/** `Next: Jassim A, Faisal J and 2 more` under Home's one card; null when nothing follows. */
export function waitingNextLine(
  rest: readonly WaitingRequest[],
  locale: Locale,
): string | null {
  const m = messagesFor(locale).requests.next;
  const names = rest.map((request) => nameOf(request.user, locale));
  const [first, second] = names;
  if (!first) {
    return null;
  }
  if (!second) {
    return m.one(first);
  }
  return names.length === 2
    ? m.two(first, second)
    : m.many(first, second, names.length - 2);
}

/** `Fri 7:00 PM football`, the heading of a Game's requests on All requests. */
export function waitingGameHeading(game: WaitingRequestGame, locale: Locale) {
  const m = messagesFor(locale).requests;
  const sport = m.sportNoun[game.sport];
  if (!game.startsAt) {
    return m.want.seatNoTime(sport);
  }
  return m.gameHeading(
    formatWeekday(game.startsAt, "short", locale),
    formatGameClock(game.startsAt, locale),
    sport,
  );
}

/**
 * `11 of 14 in, 2 seats held`: how full the Game is, counting the seats the
 * viewer's approvals took, and how many waiting requests would take a seat.
 */
export function waitingGameFill(
  game: WaitingRequestGame,
  counts: { heldSeats: number; approvedSeats: number },
  locale: Locale,
) {
  const m = messagesFor(locale).requests;
  const inCount = Math.min(
    game.capacity,
    game.registeredCount + counts.approvedSeats,
  );
  return counts.heldSeats > 0
    ? m.gameFillHeld(inCount, game.capacity, counts.heldSeats)
    : m.gameFill(inCount, game.capacity);
}

/** `Approve both`, `Approve all 3`; null when fewer than two wait. */
export function waitingBulkApproveLabel(waiting: number, locale: Locale) {
  const m = messagesFor(locale).requests;
  if (waiting < 2) {
    return null;
  }
  return waiting === 2 ? m.approveBoth : m.approveAll(waiting);
}
