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
import { formatDayMonth, formatGameClock } from "./format-game-start";
import type { FriendlyGameDetailsSide } from "./friendly-game-details";
import type { FriendlyGameHeroMatch } from "./friendly-game-hero";
import { sideSizeLabel } from "./game-shape";
import { initials } from "./initials";
import {
  padelPairLine,
  padelSetPairs,
  padelSidesInOrder,
  padelSlotOfSide,
  type PlayedPlace,
} from "./played-game";

/** The web page a shared result opens on. */
export function gameResultPath(gameId: string) {
  return `/dashboard/games/${gameId}`;
}

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

type ResultCardBase = {
  /** "FRIENDLY · PADEL" at the top of the card. */
  typeLine: string;
  /** "RATED MATCH" or "FRIENDLY MATCH" in the card's foot. */
  typeNote: string;
  venue: string;
  when: string;
  whenShort: string;
};

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

function typeNote(rated: boolean, locale: Locale) {
  const m = messagesFor(locale).game.share;
  return rated ? m.ratedMatch : m.friendlyMatch;
}

function cardVenue(place: PlayedPlace, locale: Locale) {
  const { common } = messagesFor(locale);
  return (
    [place.venue?.name, place.courtName]
      .filter((part): part is string => Boolean(part))
      .map(common.isolate)
      .join(common.listSeparator) || "Temba"
  );
}

function cardWhen(windowStart: Date | null, locale: Locale) {
  if (!windowStart) {
    return { when: "", whenShort: "" };
  }
  return {
    when: messagesFor(locale).game.share.when(
      formatDayMonth(windowStart, locale, { weekday: "short", year: true }),
      formatGameClock(windowStart, locale),
    ),
    whenShort: formatDayMonth(windowStart, locale, { weekday: "short" }),
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
    typeNote: typeNote(input.rated, locale),
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
  };
}

export type FootballResultCardInput = PlayedPlace & {
  players: readonly BoardPlayer[];
  bibs: Bibs;
  score: { slot1: number; slot2: number };
  sideSize: number | null;
  rated: boolean;
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
    typeNote: typeNote(input.rated, locale),
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
  lines.push(`📍 ${card.venue}`);
  if (card.when) {
    lines.push(`📅 ${card.when}`);
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

/** The result card for a finished Game, or null while there is nothing final. */
export function resultShareCard(
  game: ResultShareGame,
  board: ResultShareBoard | null,
  locale: Locale,
): ResultCard | null {
  const place = {
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    venue: game.venue,
  };
  if (isFootballRosterGame(game)) {
    if (
      !board?.teams ||
      !board.match?.score ||
      board.match.status !== "completed"
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
      },
      locale,
    );
  }
  const match = game.matches[0];
  if (game.phase !== "final" || !match) {
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
    },
    locale,
  );
}
