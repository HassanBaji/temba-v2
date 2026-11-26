import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  bibNames,
  byKeeperThenLevel,
  shortName,
  slotCode,
  type Bibs,
  type BoardPlayer,
} from "./football-board";
import type { FootballBib } from "./football-lineup";
import { isFootballRosterGame } from "./football-game-details";
import { formatGameClock, formatGameDay } from "./format-game-start";
import { friendlyGameResultsIsPending } from "./friendly-game-results";
import type { FriendlyGameDetailsSide } from "./friendly-game-details";
import type { FriendlyGameHeroMatch } from "./friendly-game-hero";
import { sideSizeLabel } from "./game-shape";
import { initials } from "./initials";
import { mvpDecidedByCopy, type GameMarks } from "./marks";
import {
  padelPairLine,
  padelSetPairs,
  padelSidesInOrder,
  padelSlotOfSide,
  type PlayedPlace,
} from "./played-game";

export type ResultCardPerson = {
  userId: string;
  init: string;
  name: string;
  isYou: boolean;
};

export type ResultSetRow = {
  id: string;
  label: string;
  note: "won" | "lost";
  w: number;
  l: number;
};

export type ResultCardMvp = {
  name: string;
  /** "By vote, 7 of 12", "Organizer’s pick" or "Tied vote, Organizer’s pick". */
  decidedBy: string;
};

type ResultCardBase = {
  /** "FRIENDLY · PADEL" at the top of the card. */
  typeLine: string;
  /** "RATED MATCH", "FRIENDLY MATCH" or "NOT CONFIRMED YET" in the card's foot. */
  typeNote: string;
  /** The score is entered but the other side has not confirmed it yet. */
  unconfirmed: boolean;
  venue: string;
  when: string;
  whenShort: string;
  /** The Game's MVP once settled; null while undecided or when there is none. */
  mvp: ResultCardMvp | null;
};

/**
 * The MVP line for the card, from `marks.forGame`. Only a settled MVP counts:
 * before settlement an Organizer's pick may still change.
 */
export function resultCardMvp(
  marks: Pick<GameMarks, "mvp" | "participants"> | null | undefined,
  locale: Locale,
): ResultCardMvp | null {
  if (!marks) {
    return null;
  }
  const { mvp } = marks;
  if (
    mvp.state !== "decided" ||
    !mvp.settledAt ||
    !mvp.userId ||
    !mvp.decidedBy
  ) {
    return null;
  }
  const participant = marks.participants.find(
    (row) => row.userId === mvp.userId,
  );
  if (!participant) {
    return null;
  }
  return {
    name: participant.name,
    decidedBy: mvpDecidedByCopy(mvp.decidedBy, mvp.votes, locale),
  };
}

export type PadelResultCard = ResultCardBase & {
  kind: "padel";
  winners: ResultCardPerson[];
  losers: ResultCardPerson[];
  winCount: number;
  loseCount: number;
  winnerLine: string;
  loserLine: string;
  winnerShort: string;
  loserShort: string;
  setRows: ResultSetRow[];
  draw: boolean;
};

export type FootballResultCard = ResultCardBase & {
  kind: "football";
  draw: boolean;
  win: { name: string; bib: FootballBib; score: number };
  lose: { name: string; bib: FootballBib; score: number };
  scorers: {
    userId: string;
    name: string;
    isYou: boolean;
    goals: number;
    bib: FootballBib;
    onWinningSide: boolean;
  }[];
  lineups: { win: ResultCardPerson[]; lose: ResultCardPerson[] };
  you: {
    init: string;
    name: string;
    goals: number;
    code: string | null;
  } | null;
};

export type ResultCard = PadelResultCard | FootballResultCard;

function typeNote(rated: boolean, unconfirmed: boolean, locale: Locale) {
  const m = messagesFor(locale).game.share;
  if (unconfirmed) {
    return m.unconfirmedMatch;
  }
  return rated ? m.ratedMatch : m.friendlyMatch;
}

export function cardVenue(place: PlayedPlace, locale: Locale) {
  const { common } = messagesFor(locale);
  return (
    [place.venue?.name, place.courtName]
      .filter((part): part is string => Boolean(part))
      .map(common.isolate)
      .join(common.listSeparator) || "Temba"
  );
}

export function cardWhen(windowStart: Date | null, locale: Locale) {
  if (!windowStart) {
    return { when: "", whenShort: "" };
  }
  return {
    when: messagesFor(locale).game.share.when(
      formatGameDay(windowStart, locale, { weekday: "short", year: true }),
      formatGameClock(windowStart, locale),
    ),
    whenShort: formatGameDay(windowStart, locale, { weekday: "short" }),
  };
}

function person(
  seat: { userId: string; name: string },
  viewerUserId: string,
): ResultCardPerson {
  return {
    userId: seat.userId,
    init: initials(seat.name),
    name: seat.name,
    isYou: seat.userId === viewerUserId,
  };
}

function padelPeople(
  side: FriendlyGameDetailsSide | null,
  viewerUserId: string,
) {
  if (!side) {
    return [];
  }
  return [side.left, side.right].flatMap((seat) =>
    seat ? [person(seat, viewerUserId)] : [],
  );
}

function shortOf(people: readonly ResultCardPerson[]) {
  return people.map((row) => row.init.charAt(0)).join("") || "–";
}

export type PadelResultCardInput = PlayedPlace & {
  sides: readonly FriendlyGameDetailsSide[];
  viewerUserId: string;
  match: FriendlyGameHeroMatch;
  rated: boolean;
  unconfirmed?: boolean;
  mvp?: ResultCardMvp | null;
};

export function padelResultCard(
  input: PadelResultCardInput,
  locale: Locale,
): PadelResultCard {
  const m = messagesFor(locale).game.share;
  const { a, b } = padelSidesInOrder(input.sides, input.viewerUserId);
  const slotA = a ? padelSlotOfSide(a, input.match) : 1;
  const slotB: 1 | 2 = slotA === 1 ? 2 : 1;
  const { result } = input.match.outcome;
  const aWon = result === `slot${slotA}`;
  const bWon = result === `slot${slotB}`;
  const winner = bWon ? b : a;
  const loser = bWon ? a : b;
  const winnerSlot = bWon ? slotB : slotA;
  const pairs = padelSetPairs(input.match);
  const games = (pair: { slot1: number; slot2: number }, slot: 1 | 2) =>
    slot === 1 ? pair.slot1 : pair.slot2;
  const setRows: ResultSetRow[] = pairs.map((pair, index) => {
    const w = games(pair, winnerSlot);
    const l = games(pair, winnerSlot === 1 ? 2 : 1);
    return {
      id: pair.id,
      label: m.setLabel(index + 1),
      note: w > l ? "won" : "lost",
      w,
      l,
    };
  });
  const winners = padelPeople(winner, input.viewerUserId);
  const losers = padelPeople(loser, input.viewerUserId);
  return {
    kind: "padel",
    typeLine: m.padelTypeLine,
    typeNote: typeNote(input.rated, input.unconfirmed ?? false, locale),
    unconfirmed: input.unconfirmed ?? false,
    winners,
    losers,
    winCount: setRows.filter((row) => row.w > row.l).length,
    loseCount: setRows.filter((row) => row.l > row.w).length,
    winnerLine: padelPairLine(winner, input.viewerUserId, locale, "first"),
    loserLine: padelPairLine(loser, input.viewerUserId, locale, "first"),
    winnerShort: shortOf(winners),
    loserShort: shortOf(losers),
    setRows,
    draw: !aWon && !bWon,
    venue: cardVenue(input, locale),
    ...cardWhen(input.windowStart, locale),
    mvp: input.mvp ?? null,
  };
}

export type FootballResultCardInput = PlayedPlace & {
  players: readonly BoardPlayer[];
  bibs: Bibs;
  score: { slot1: number; slot2: number };
  sideSize: number | null;
  rated: boolean;
  unconfirmed?: boolean;
  mvp?: ResultCardMvp | null;
};

export function footballResultCard(
  input: FootballResultCardInput,
  locale: Locale,
): FootballResultCard {
  const m = messagesFor(locale).game.share;
  const names = bibNames(input.bibs, locale);
  const slot2Won = input.score.slot2 > input.score.slot1;
  const winSlot: 1 | 2 = slot2Won ? 2 : 1;
  const loseSlot: 1 | 2 = slot2Won ? 1 : 2;
  const sideOf = (slot: 1 | 2) => ({
    name: slot === 1 ? names.slot1 : names.slot2,
    bib: slot === 1 ? input.bibs.slot1 : input.bibs.slot2,
    score: slot === 1 ? input.score.slot1 : input.score.slot2,
  });
  const lineup = (slot: 1 | 2) =>
    input.players
      .filter((player) => player.sideIndex === slot)
      .sort(byKeeperThenLevel)
      .map((player) => ({
        userId: player.userId,
        init: initials(player.name),
        name: player.name,
        isYou: player.isViewer,
      }));
  const scorers = input.players
    .filter((player) => player.goals > 0 && player.sideIndex != null)
    .sort((left, right) => {
      const side =
        Number(right.sideIndex === winSlot) -
        Number(left.sideIndex === winSlot);
      return side !== 0 ? side : right.goals - left.goals;
    })
    .map((player) => ({
      userId: player.userId,
      name: player.name,
      isYou: player.isViewer,
      goals: player.goals,
      bib: player.sideIndex === 1 ? input.bibs.slot1 : input.bibs.slot2,
      onWinningSide: player.sideIndex === winSlot,
    }));
  const viewer = input.players.find((player) => player.isViewer);
  return {
    kind: "football",
    typeLine: m.footballTypeLine(
      input.sideSize
        ? sideSizeLabel(input.sideSize, locale).toUpperCase()
        : null,
    ),
    typeNote: typeNote(input.rated, input.unconfirmed ?? false, locale),
    unconfirmed: input.unconfirmed ?? false,
    draw: input.score.slot1 === input.score.slot2,
    win: sideOf(winSlot),
    lose: sideOf(loseSlot),
    scorers,
    lineups: { win: lineup(winSlot), lose: lineup(loseSlot) },
    you: viewer?.sideIndex
      ? {
          init: initials(viewer.name),
          name: viewer.name,
          goals: viewer.goals,
          code: slotCode(viewer, locale),
        }
      : null,
    venue: cardVenue(input, locale),
    ...cardWhen(input.windowStart, locale),
    mvp: input.mvp ?? null,
  };
}

/** The sticker's one-line verdict: "ELIN & MARYAM WIN 2–1". */
export function padelStickerLine(card: PadelResultCard, locale: Locale) {
  const m = messagesFor(locale).game.share;
  if (card.draw) {
    return m.draw;
  }
  return m
    .stickerWin(card.winnerLine, card.winCount, card.loseCount)
    .toUpperCase();
}

export function formatPadelResultShareMessage(
  card: PadelResultCard,
  url: string,
  locale: Locale,
) {
  const m = messagesFor(locale).game.share;
  const lines = [m.padelResult];
  lines.push(
    card.draw
      ? m.drew(card.winnerLine, card.loserLine)
      : m.beat(card.winnerLine, card.loserLine, card.winCount, card.loseCount),
  );
  if (card.setRows.length > 0) {
    lines.push(
      card.setRows.map((row) => `${row.label} ${row.w}–${row.l}`).join(" · "),
    );
  }
  if (card.unconfirmed) {
    lines.push(m.unconfirmedLine);
  }
  lines.push(`📍 ${card.venue}`);
  if (card.when) {
    lines.push(`📅 ${card.when}`);
  }
  lines.push(`🔗 ${url}`);
  return lines.join("\n");
}

export function formatFootballResultShareMessage(
  card: FootballResultCard,
  url: string,
  locale: Locale,
) {
  const lines = [messagesFor(locale).game.share.footballResult];
  lines.push(
    `${card.draw ? "🤝" : "🏆"} ${card.win.name} ${card.win.score}–${card.lose.score} ${card.lose.name}`,
  );
  if (card.scorers.length > 0) {
    lines.push(
      `⚽ ${card.scorers
        .map((scorer) =>
          scorer.goals > 1
            ? `${shortName(scorer.name)} ×${scorer.goals}`
            : shortName(scorer.name),
        )
        .join(messagesFor(locale).common.listSeparator)}`,
    );
  }
  if (card.unconfirmed) {
    lines.push(messagesFor(locale).game.share.unconfirmedLine);
  }
  lines.push(`📍 ${card.venue}`);
  if (card.when) {
    lines.push(`📅 ${card.when}`);
  }
  lines.push(`🔗 ${url}`);
  return lines.join("\n");
}

/**
 * The message for a played Game with no score entered yet: there is no result
 * to put on a card, so it names who played, says the score is still to come
 * and links the Game page.
 */
export function playedGameShareMessage(
  game: ResultShareGame,
  url: string,
  locale: Locale,
) {
  const m = messagesFor(locale).game.share;
  const football = isFootballRosterGame(game);
  const lines = [football ? m.footballPlayed : m.padelPlayed];
  if (!football) {
    const { a, b } = padelSidesInOrder(game.sides, game.viewerUserId);
    if (a && b) {
      lines.push(
        m.versus(
          padelPairLine(a, game.viewerUserId, locale, "first"),
          padelPairLine(b, game.viewerUserId, locale, "first"),
        ),
      );
    }
  }
  lines.push(m.noScoreLine);
  const venue = cardVenue(
    {
      ...game,
      courtName: football
        ? (game.recordedCourts[0]?.name ?? null)
        : (game.matches[0]?.courtName ?? null),
    },
    locale,
  );
  if (venue) {
    lines.push(`📍 ${venue}`);
  }
  const { when } = cardWhen(game.windowStart, locale);
  if (when) {
    lines.push(`📅 ${when}`);
  }
  lines.push(`🔗 ${url}`);
  return lines.join("\n");
}

export function formatResultShareMessage(
  card: ResultCard,
  url: string,
  locale: Locale,
) {
  return card.kind === "padel"
    ? formatPadelResultShareMessage(card, url, locale)
    : formatFootballResultShareMessage(card, url, locale);
}

export type ResultShareGame = {
  sport: string | null;
  roster?: unknown;
  phase: string | null;
  viewerUserId: string;
  rated: boolean;
  windowStart: Date | null;
  windowEnd: Date | null;
  venue: { name: string; city: string | null } | null;
  sideSize: number | null;
  recordedCourts: readonly { name: string }[];
  sides: FriendlyGameDetailsSide[];
  matches: readonly (FriendlyGameHeroMatch & { courtName: string | null })[];
};

export type ResultShareBoard = {
  players: readonly BoardPlayer[];
  teams: { bibs: Bibs } | null;
  match: {
    status: string | null;
    score: { slot1: number; slot2: number } | null;
  } | null;
};

/**
 * A padel Match whose time is over and whose score is entered but not yet
 * confirmed by the other side: it can be shared, marked as not confirmed.
 */
export function padelScoreAwaitsConfirmation(
  phase: string | null,
  match: { sets: FriendlyGameHeroMatch["sets"] } | null | undefined,
) {
  return (
    phase === "needs_results" &&
    match != null &&
    !friendlyGameResultsIsPending(match.sets)
  );
}

/** A football Match with a Score entered that the other side has not confirmed. */
export function footballScoreAwaitsConfirmation(
  match: ResultShareBoard["match"] | null | undefined,
) {
  return (
    match?.score != null &&
    match.status !== "completed" &&
    match.status !== "cancelled"
  );
}

/**
 * The result card for a played Game: final, or entered and waiting on the
 * other side's confirmation (marked so). Null while there is no score.
 */
export function resultShareCard(
  game: ResultShareGame,
  board: ResultShareBoard | null,
  locale: Locale,
  mvp: ResultCardMvp | null = null,
): ResultCard | null {
  const place = {
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    venue: game.venue,
  };
  if (isFootballRosterGame(game)) {
    const unconfirmed = footballScoreAwaitsConfirmation(board?.match);
    if (
      !board?.teams ||
      !board.match?.score ||
      (board.match.status !== "completed" && !unconfirmed)
    ) {
      return null;
    }
    return footballResultCard(
      {
        ...place,
        players: board.players,
        bibs: board.teams.bibs,
        score: board.match.score,
        sideSize: game.sideSize,
        courtName: game.recordedCourts[0]?.name ?? null,
        rated: game.rated,
        unconfirmed,
        mvp,
      },
      locale,
    );
  }
  const match = game.matches[0];
  const unconfirmed = padelScoreAwaitsConfirmation(game.phase, match);
  if (!match || (game.phase !== "final" && !unconfirmed)) {
    return null;
  }
  return padelResultCard(
    {
      ...place,
      sides: game.sides,
      viewerUserId: game.viewerUserId,
      match,
      courtName: match.courtName,
      rated: game.rated,
      unconfirmed,
      mvp,
    },
    locale,
  );
}
