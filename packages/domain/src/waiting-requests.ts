import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatGameClock, formatWeekday } from "./format-game-start";
import { formatOvr, ovrFromLevel } from "./football-ovr";
import { displayLabelFromStoredBand } from "./level-bands";
import { tenthsToLevelBand } from "./level-range";
import type { Sport } from "./sport";

/**
 * A request waiting on the viewer as an Organizer or Group approver: a Game
 * Level range request, a Group join request with a live Seat hold, or a Group
 * join request without one. Home, Notifications and All requests read it as
 * one card.
 */
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

export type WaitingRequest =
  | (WaitingRequestBase & {
      kind: "level_range";
      game: WaitingRequestGame;
      requesterInGroup: boolean;
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

function time(value: Date | string) {
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
    return time(request.seatHeldUntil);
  }
  if (request.kind === "level_range" && request.game.startsAt) {
    return time(request.game.startsAt);
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
  return time(a.createdAt) - time(b.createdAt) || a.id.localeCompare(b.id);
}

export function sortWaitingRequests<T extends WaitingRequest>(
  requests: readonly T[],
): T[] {
  return [...requests].sort(compareWaitingRequests);
}

/** `52` for football (OVR), `C+` for padel (Level band). */
export function waitingRequestLevelLabel(
  tenths: number | null,
  sport: Sport,
): string | null {
  if (tenths == null) {
    return null;
  }
  return sport === "football"
    ? formatOvr(ovrFromLevel(tenths / 10))
    : displayLabelFromStoredBand(tenthsToLevelBand(tenths));
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

function leftLabel(minutes: number, locale: Locale) {
  const m = messagesFor(locale).requests.time;
  if (minutes < MINUTES_PER_HOUR) {
    return m.minutesLeft(Math.max(1, minutes));
  }
  if (minutes < MINUTES_PER_DAY) {
    return m.hoursLeft(Math.floor(minutes / MINUTES_PER_HOUR));
  }
  return m.daysLeft(Math.floor(minutes / MINUTES_PER_DAY));
}

function inLabel(minutes: number, locale: Locale) {
  const m = messagesFor(locale).requests.time;
  if (minutes < MINUTES_PER_HOUR) {
    return m.inMinutes(Math.max(1, minutes));
  }
  if (minutes < MINUTES_PER_DAY) {
    return m.inHours(Math.floor(minutes / MINUTES_PER_HOUR));
  }
  return m.inDays(Math.floor(minutes / MINUTES_PER_DAY));
}

function agoLabel(minutes: number, locale: Locale) {
  const m = messagesFor(locale).requests.time;
  if (minutes < 1) {
    return m.justNow;
  }
  if (minutes < MINUTES_PER_HOUR) {
    return m.minutesAgo(minutes);
  }
  if (minutes < MINUTES_PER_DAY) {
    return m.hoursAgo(Math.floor(minutes / MINUTES_PER_HOUR));
  }
  return m.daysAgo(Math.floor(minutes / MINUTES_PER_DAY));
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
      value: leftLabel(
        minutesBetween(nowMs, time(request.seatHeldUntil)),
        locale,
      ),
    };
  }
  if (request.kind === "level_range" && request.game.startsAt) {
    return {
      label: m.starts,
      value: inLabel(
        minutesBetween(nowMs, time(request.game.startsAt)),
        locale,
      ),
    };
  }
  return {
    label: m.asked,
    value: agoLabel(minutesBetween(time(request.createdAt), nowMs), locale),
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

function gameIsFull(game: WaitingRequestGame) {
  return game.registeredCount >= game.capacity;
}

/** The line an answered request leaves behind, after the name: `is in Friday’s game`, `declined, seat freed`. */
export function waitingRequestDoneText(
  request: WaitingRequest,
  decision: RequestDecision,
  locale: Locale,
) {
  const m = messagesFor(locale).requests.done;
  if (decision === "decline") {
    return request.kind === "seat_hold" ? m.declinedSeatFreed : m.declined;
  }
  if (!isSeatRequest(request)) {
    return m.inGroup(groupNameOf(request.group.name, locale));
  }
  const { startsAt } = request.game;
  if (!startsAt) {
    return m.inTheGame;
  }
  const weekday = formatWeekday(startsAt, "long", locale);
  const full = gameIsFull(request.game);
  if (request.kind === "seat_hold") {
    return full ? m.onWaitlistAndGroup(weekday) : m.inGameAndGroup(weekday);
  }
  return full ? m.onWaitlist(weekday) : m.inGame(weekday);
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
 * `11 of 14 in, 2 seats held`: how full the Game is, counting requests the
 * viewer just approved, and how many seat requests still wait on it.
 */
export function waitingGameFill(
  game: WaitingRequestGame,
  counts: { waiting: number; approved: number },
  locale: Locale,
) {
  const m = messagesFor(locale).requests;
  const inCount = Math.min(
    game.capacity,
    game.registeredCount + counts.approved,
  );
  return counts.waiting > 0
    ? m.gameFillHeld(inCount, game.capacity, counts.waiting)
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

export type WaitingGameRequests<T extends WaitingRequest> = {
  game: WaitingRequestGame;
  requests: T[];
};

/** All requests: seat requests by Game, in the order their most urgent request comes, then Group join requests. */
export function groupWaitingRequests<T extends WaitingRequest>(
  requests: readonly T[],
): { games: WaitingGameRequests<T>[]; groups: T[] } {
  const byGame = new Map<string, WaitingGameRequests<T>>();
  const groups: T[] = [];
  for (const request of sortWaitingRequests(requests)) {
    if (!isSeatRequest(request)) {
      groups.push(request);
      continue;
    }
    const entry = byGame.get(request.game.id);
    if (entry) {
      entry.requests.push(request);
    } else {
      byGame.set(request.game.id, { game: request.game, requests: [request] });
    }
  }
  return { games: [...byGame.values()], groups };
}

/** How many of the waiting requests a screen shows before its `N more requests` row. */
export const NOTIFICATIONS_REQUEST_LIMIT = 3;

/** How long an answer waits, with Undo, before it is sent. */
export const REQUEST_UNDO_WINDOW_MS = 6000;

/** An answer given in this session: sent once `committed`, undoable until then. */
export type RequestAnswer = {
  decision: RequestDecision;
  committed: boolean;
  answeredAt: number;
};

export type AnsweredRequest<T extends WaitingRequest = WaitingRequest> = {
  request: T;
  answer: RequestAnswer;
};

export type RequestRow<T extends WaitingRequest = WaitingRequest> = {
  request: T;
  answer: RequestAnswer | null;
};

/**
 * The server's waiting list merged with this session's answers, most urgent
 * first. An answered request keeps its place as a line, from the snapshot
 * taken when it was answered, after the server stops listing it.
 */
export function requestRows<T extends WaitingRequest>(
  waiting: readonly T[],
  answered: ReadonlyMap<string, AnsweredRequest<T>>,
): RequestRow<T>[] {
  const rows: RequestRow<T>[] = waiting
    .filter((request) => !answered.has(request.id))
    .map((request) => ({ request, answer: null }));
  for (const entry of answered.values()) {
    rows.push({ request: entry.request, answer: entry.answer });
  }
  return rows.sort((a, b) => compareWaitingRequests(a.request, b.request));
}

/**
 * Home: one full request, the most urgent, under the line the last answer
 * left while it can still be undone. The section leaves Home once nothing
 * waits and nothing can be undone.
 */
export function homeRequestsView<T extends WaitingRequest>(
  rows: readonly RequestRow<T>[],
) {
  const waiting = rows.filter((row) => row.answer == null);
  const [current, ...rest] = waiting;
  const last = rows
    .filter((row) => row.answer != null && !row.answer.committed)
    .sort(
      (a, b) => (b.answer?.answeredAt ?? 0) - (a.answer?.answeredAt ?? 0),
    )[0];
  return {
    visible: waiting.length > 0 || last != null,
    waitingCount: waiting.length,
    current: current?.request ?? null,
    rest: rest.map((row) => row.request),
    last: last ?? null,
  };
}

/** Notifications: every answer stays as a line, plus the most urgent requests still waiting, up to the limit. */
export function notificationsRequestsView<T extends WaitingRequest>(
  rows: readonly RequestRow<T>[],
  limit: number = NOTIFICATIONS_REQUEST_LIMIT,
) {
  let shown = 0;
  const visibleRows = rows.filter(
    (row) => row.answer != null || shown++ < limit,
  );
  const waitingCount = rows.filter((row) => row.answer == null).length;
  return {
    visible: rows.length > 0,
    waitingCount,
    rows: visibleRows,
    moreCount: Math.max(0, waitingCount - limit),
  };
}
