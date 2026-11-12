import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  byKeeperThenLevel,
  bibNames,
  levelLabel,
  shortName,
  sideAverage,
  slotCode,
  type Bibs,
  type BoardPlayer,
} from "./football-board";
import {
  footballTeamsMethodLabel,
  type FootballBib,
  type FootballTeamsMethod,
} from "./football-lineup";
import { formatGameClock, formatGameDay } from "./format-game-start";
import type { FriendlyGameDetailsSide } from "./friendly-game-details";
import type { FriendlyGameHeroMatch } from "./friendly-game-hero";
import { sideSizeLabel } from "./game-shape";
import { ratingScopeOf } from "./game-rating-impact";
import {
  gameRatingScopeLabel,
  type GameRatingScope,
} from "./game-rating-scope";
import { setShortLabel } from "./game-copy";
import { formatGameSideLabel } from "./game-side-label";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";

export type PlayedWord = "Won" | "Lost" | "Draw";

export type PlayedRow = {
  userId: string;
  /** "You" for the viewer, otherwise the short name. */
  name: string;
  fullName: string;
  image: string | null;
  isYou: boolean;
  /** LEFT or RIGHT on padel; GK, DEF, MID or FWD on football. */
  meta: string | null;
  level: string;
  /** "2 goals" on football, nothing on padel. */
  trailing: string | null;
  unclaimed: boolean;
  phoneMasked: string | null;
};

export type PlayedColumn = {
  key: "a" | "b";
  title: string;
  word: PlayedWord;
  won: boolean;
  /** Padel fills the viewer's pair in ink; football rows wear the bib. */
  fill: "ink" | "paper";
  bib: FootballBib | null;
  players: PlayedRow[];
};

export type PlayedFact = { label: string; value: string };

export type PlayedResultLine = {
  line: string;
  hasWinner: boolean;
};

export type PlayedYouLine = {
  line: string;
  ratingLine: string;
  tag: "WON" | "LOST" | "DRAW";
  won: boolean;
};

export type PlayedRatingImpact = {
  levelChange: number;
  newLevelBand: LevelBand;
};

export type PlayedPlace = {
  windowStart: Date | null;
  windowEnd: Date | null;
  venue: { name: string; city: string | null } | null;
  /** The court on padel, the pitch on football. */
  courtName: string | null;
};

export function playedDateLine(windowStart: Date | null, locale: Locale) {
  const m = messagesFor(locale).game.played;
  return windowStart
    ? m.playedOn(formatGameDay(windowStart, locale, { weekday: "short" }))
    : m.played;
}

export function playedDurationLabel(
  windowStart: Date | null,
  windowEnd: Date | null,
  locale: Locale,
) {
  if (!windowStart || !windowEnd) {
    return null;
  }
  const minutes = Math.round(
    (windowEnd.getTime() - windowStart.getTime()) / 60_000,
  );
  return minutes >= 1 ? messagesFor(locale).game.played.minutes(minutes) : null;
}

/** "Padel Hub, Court 3" */
export function playedVenueLine(place: PlayedPlace, locale: Locale) {
  const { common } = messagesFor(locale);
  const line = [place.venue?.name, place.courtName]
    .filter((part): part is string => Boolean(part))
    .map(common.isolate)
    .join(common.listSeparator);
  return line || null;
}

/** "8:00 PM, 90 min, Janabiyah" */
export function playedWhenLine(place: PlayedPlace, locale: Locale) {
  const { common } = messagesFor(locale);
  const line = [
    place.windowStart ? formatGameClock(place.windowStart, locale) : null,
    playedDurationLabel(place.windowStart, place.windowEnd, locale),
    place.venue?.city ? common.isolate(place.venue.city) : null,
  ]
    .filter(Boolean)
    .join(common.listSeparator);
  return line || null;
}

export function playedRatingLine(
  rated: boolean,
  impact: PlayedRatingImpact | null,
  locale: Locale,
) {
  const m = messagesFor(locale).game.played;
  if (!rated) {
    return m.friendlyNoRating;
  }
  if (!impact) {
    return m.countsForRating;
  }
  const band = displayLabelFromStoredBand(impact.newLevelBand);
  if (impact.levelChange > 0) {
    return m.ratingMovesUp(band);
  }
  if (impact.levelChange < 0) {
    return m.ratingMovesDown(band);
  }
  return m.ratingHolds(band);
}

export function playedWord(won: boolean, hasWinner: boolean): PlayedWord {
  return won ? "Won" : hasWinner ? "Lost" : "Draw";
}

/** The word a column or board row shows for its `word`. */
export function playedWordLabel(word: PlayedWord, locale: Locale) {
  const m = messagesFor(locale).game.played.word;
  return word === "Won" ? m.won : word === "Lost" ? m.lost : m.draw;
}

/** The pill text for a `PlayedYouLine["tag"]`. */
export function playedTagLabel(tag: PlayedYouLine["tag"], locale: Locale) {
  const m = messagesFor(locale).game.played.tag;
  return tag === "WON" ? m.won : tag === "LOST" ? m.lost : m.draw;
}

function youTag(word: PlayedWord): PlayedYouLine["tag"] {
  return word === "Won" ? "WON" : word === "Lost" ? "LOST" : "DRAW";
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

type PadelSeat = NonNullable<FriendlyGameDetailsSide["left"]>;

function seatsOf(side: FriendlyGameDetailsSide | null) {
  return side
    ? [side.left, side.right].filter((seat): seat is PadelSeat => seat != null)
    : [];
}

/** "You & Maryam K", "Hassan A & Khalid M", or "Open" seats. */
export function padelPairLine(
  side: FriendlyGameDetailsSide | null,
  viewerUserId: string,
  locale: Locale,
  style: "short" | "first" = "short",
) {
  const messages = messagesFor(locale);
  const m = messages.game.played;
  if (!side) {
    return m.open;
  }
  const label = (seat: PadelSeat | null) => {
    if (!seat) {
      return m.open;
    }
    if (seat.userId === viewerUserId) {
      return messages.common.you;
    }
    return style === "first" ? firstName(seat.name) : shortName(seat.name);
  };
  const [first, second] =
    side.right?.userId === viewerUserId
      ? [side.right, side.left]
      : [side.left, side.right];
  return m.pair(label(first), label(second));
}

/** Which Match slot each side backs: its Game team, else its index. */
export function padelSlotOfSide(
  side: FriendlyGameDetailsSide,
  match: Pick<FriendlyGameHeroMatch, "slot1GameTeamId" | "slot2GameTeamId">,
): 1 | 2 {
  if (side.gameTeamId && side.gameTeamId === match.slot2GameTeamId) {
    return 2;
  }
  if (side.gameTeamId && side.gameTeamId === match.slot1GameTeamId) {
    return 1;
  }
  return side.sideIndex === 2 ? 2 : 1;
}

export type PadelSetPair = { id: string; slot1: number; slot2: number };

/** The Sets that were played, with games for each slot. */
export function padelSetPairs(
  match: Pick<FriendlyGameHeroMatch, "sets">,
): PadelSetPair[] {
  return match.sets.flatMap((set) =>
    set.slot1GamesWon == null || set.slot2GamesWon == null
      ? []
      : [{ id: set.id, slot1: set.slot1GamesWon, slot2: set.slot2GamesWon }],
  );
}

export function padelViewerSide(
  sides: readonly FriendlyGameDetailsSide[],
  viewerUserId: string,
) {
  return (
    sides.find(
      (side) =>
        side.left?.userId === viewerUserId ||
        side.right?.userId === viewerUserId,
    ) ?? null
  );
}

/**
 * The two sides in reading order: the viewer's pair first when they played,
 * otherwise side 1 then side 2.
 */
export function padelSidesInOrder(
  sides: readonly FriendlyGameDetailsSide[],
  viewerUserId: string,
): { a: FriendlyGameDetailsSide | null; b: FriendlyGameDetailsSide | null } {
  const viewerSide = padelViewerSide(sides, viewerUserId);
  const a = viewerSide ?? sides[0] ?? null;
  const b = sides.find((side) => side !== a) ?? null;
  return { a, b };
}

export type PlayedPadelBoardRow = {
  line: string;
  word: PlayedWord;
  won: boolean;
  sets: { id: string; value: number; won: boolean }[];
};

export type PlayedPadelInput = PlayedPlace & {
  sides: readonly FriendlyGameDetailsSide[];
  viewerUserId: string;
  match: FriendlyGameHeroMatch;
  groupName: string | null;
  rated: boolean;
  ratingScope?: GameRatingScope;
  publicGame?: boolean;
  ratingImpact: PlayedRatingImpact | null;
  confirmation: { confirmedByOrganizer?: boolean } | null;
};

export type PlayedPadelModel = {
  dateLine: string;
  tag: string;
  setLabels: string[];
  board: [PlayedPadelBoardRow, PlayedPadelBoardRow];
  result: PlayedResultLine;
  venueLine: string | null;
  whenLine: string | null;
  you: PlayedYouLine | null;
  columns: [PlayedColumn, PlayedColumn];
  facts: PlayedFact[];
};

function padelRows(
  side: FriendlyGameDetailsSide | null,
  viewerUserId: string,
  locale: Locale,
): PlayedRow[] {
  if (!side) {
    return [];
  }
  const messages = messagesFor(locale);
  return (["left", "right"] as const).flatMap((position) => {
    const seat = side[position];
    if (!seat) {
      return [];
    }
    const isYou = seat.userId === viewerUserId;
    return [
      {
        userId: seat.userId,
        name: isYou ? messages.common.you : shortName(seat.name),
        fullName: seat.name,
        image: seat.image,
        isYou,
        meta: messages.game.played.seatCode[position],
        level: levelLabel(seat.levelBand),
        trailing: null,
        unclaimed: Boolean(seat.unclaimed),
        phoneMasked: seat.phoneMasked ?? null,
      },
    ];
  });
}

export function playedPadelModel(
  input: PlayedPadelInput,
  locale: Locale,
): PlayedPadelModel {
  const messages = messagesFor(locale);
  const m = messages.game.played;
  const scope = ratingScopeOf(input);
  const { a, b } = padelSidesInOrder(input.sides, input.viewerUserId);
  const viewerPlayed = padelViewerSide(input.sides, input.viewerUserId) != null;
  const slotA = a ? padelSlotOfSide(a, input.match) : 1;
  const slotB: 1 | 2 = slotA === 1 ? 2 : 1;
  const pairs = padelSetPairs(input.match);
  const games = (pair: PadelSetPair, slot: 1 | 2) =>
    slot === 1 ? pair.slot1 : pair.slot2;
  const { result } = input.match.outcome;
  const hasWinner = result === "slot1" || result === "slot2";
  const aWon = result === `slot${slotA}`;
  const bWon = result === `slot${slotB}`;
  const aSetWins = pairs.filter(
    (pair) => games(pair, slotA) > games(pair, slotB),
  ).length;
  const bSetWins = pairs.filter(
    (pair) => games(pair, slotB) > games(pair, slotA),
  ).length;
  const row = (
    side: FriendlyGameDetailsSide | null,
    slot: 1 | 2,
    won: boolean,
  ): PlayedPadelBoardRow => ({
    line: padelPairLine(side, input.viewerUserId, locale),
    word: playedWord(won, hasWinner),
    won,
    sets: pairs.map((pair) => ({
      id: pair.id,
      value: games(pair, slot),
      won: games(pair, slot) > games(pair, slot === 1 ? 2 : 1),
    })),
  });
  const winner = aWon ? a : bWon ? b : null;
  const winnerSetWins = aWon ? aSetWins : bSetWins;
  const loserSetWins = aWon ? bSetWins : aSetWins;
  const resultLine = winner
    ? m.winInSets(
        padelPairLine(winner, input.viewerUserId, locale, "first"),
        winnerSetWins,
        loserSetWins,
      )
    : result === "draw"
      ? m.drawLevel
      : m.noResult;

  const viewerSide = viewerPlayed ? a : null;
  const partner = viewerSide
    ? seatsOf(viewerSide).find((seat) => seat.userId !== input.viewerUserId)
    : undefined;
  const youWord = playedWord(aWon, hasWinner);
  const you: PlayedYouLine | null = viewerSide
    ? {
        line: partner ? m.playedWith(shortName(partner.name)) : m.playedAlone,
        ratingLine: input.match.stoodUnconfirmed
          ? messages.rating.publicGame.stood
          : scope === "group"
            ? gameRatingScopeLabel(scope, locale)
            : playedRatingLine(input.rated, input.ratingImpact, locale),
        tag: youTag(youWord),
        won: aWon,
      }
    : null;

  const column = (
    key: "a" | "b",
    side: FriendlyGameDetailsSide | null,
    won: boolean,
  ): PlayedColumn => ({
    key,
    title: viewerPlayed
      ? key === "a"
        ? m.yourPair
        : m.opponents
      : side
        ? formatGameSideLabel("friendly_game", side.sideIndex, locale)
        : m.open,
    word: playedWord(won, hasWinner),
    won,
    fill: key === "a" ? "ink" : "paper",
    bib: null,
    players: padelRows(side, input.viewerUserId, locale),
  });

  const facts: PlayedFact[] = [
    ...(input.groupName ? [{ label: m.group, value: input.groupName }] : []),
    {
      label: m.confirmed,
      value: input.match.stoodUnconfirmed
        ? messages.rating.publicGame.notInTime
        : input.confirmation?.confirmedByOrganizer
          ? m.byTheOrganizer
          : m.byBothPairs,
    },
    {
      label: m.format,
      value: m.sets(pairs.length),
    },
    {
      label: messages.you.ratingScope.title,
      value:
        input.publicGame && scope === "temba"
          ? messages.rating.scope.temba
          : gameRatingScopeLabel(scope, locale),
    },
  ];

  return {
    dateLine: playedDateLine(input.windowStart, locale),
    tag: m.padel,
    setLabels: pairs.map((_, index) => setShortLabel(index, locale)),
    board: [row(a, slotA, aWon), row(b, slotB, bWon)],
    result: { line: resultLine, hasWinner },
    venueLine: playedVenueLine(input, locale),
    whenLine: playedWhenLine(input, locale),
    you,
    columns: [column("a", a, aWon), column("b", b, bWon)],
    facts,
  };
}

export type PlayedFootballSide = {
  name: string;
  bib: FootballBib;
  average: string;
  score: number;
  won: boolean;
};

export type PlayedScorer = {
  userId: string;
  name: string;
  isYou: boolean;
  count: string;
};

export type PlayedFootballInput = PlayedPlace & {
  players: readonly BoardPlayer[];
  bibs: Bibs;
  score: { slot1: number; slot2: number };
  confirmed: { slot1: boolean; slot2: boolean };
  enteredByName: string | null;
  teamsMethod: FootballTeamsMethod | null;
  sideSize: number | null;
  groupName: string | null;
  rated: boolean;
  ratingImpact: PlayedRatingImpact | null;
  /** A Public Game's score the other side did not confirm in time (ADR-0071). */
  stoodUnconfirmed?: boolean;
};

export type PlayedFootballModel = {
  dateLine: string;
  tag: string | null;
  board: [PlayedFootballSide, PlayedFootballSide];
  scorers: { a: PlayedScorer[]; b: PlayedScorer[] } | null;
  result: PlayedResultLine;
  venueLine: string | null;
  whenLine: string | null;
  you: PlayedYouLine | null;
  columns: [PlayedColumn, PlayedColumn];
  /** On the roster but on neither team, e.g. added after the Game. */
  unplaced: PlayedRow[];
  facts: PlayedFact[];
};

export function goalsLabel(goals: number, locale: Locale) {
  return messagesFor(locale).game.played.goals(goals);
}

function footballRow(player: BoardPlayer, locale: Locale): PlayedRow {
  return {
    userId: player.userId,
    name: player.isViewer
      ? messagesFor(locale).common.you
      : shortName(player.name),
    fullName: player.name,
    image: player.image,
    isYou: player.isViewer,
    meta: slotCode(player, locale),
    level: levelLabel(player.levelBand),
    trailing: player.goals > 0 ? goalsLabel(player.goals, locale) : null,
    unclaimed: Boolean(player.unclaimed),
    phoneMasked: player.phoneMasked ?? null,
  };
}

export function footballResultLine(
  score: { slot1: number; slot2: number },
  names: { slot1: string; slot2: string },
  locale: Locale,
) {
  const m = messagesFor(locale).game.played;
  if (score.slot1 === score.slot2) {
    return m.drawLevel;
  }
  const winner = score.slot1 > score.slot2 ? names.slot1 : names.slot2;
  return m.winBy(winner, Math.abs(score.slot1 - score.slot2));
}

export function playedFootballModel(
  input: PlayedFootballInput,
  locale: Locale,
): PlayedFootballModel {
  const messages = messagesFor(locale);
  const m = messages.game.played;
  const names = bibNames(input.bibs, locale);
  const onSide = (index: 1 | 2) =>
    input.players
      .filter((player) => player.sideIndex === index)
      .sort(byKeeperThenLevel);
  const slot1 = onSide(1);
  const slot2 = onSide(2);
  const hasWinner = input.score.slot1 !== input.score.slot2;
  const slot1Won = input.score.slot1 > input.score.slot2;
  const slot2Won = input.score.slot2 > input.score.slot1;
  const side = (
    index: 1 | 2,
    players: BoardPlayer[],
    won: boolean,
  ): PlayedFootballSide => ({
    name: index === 1 ? names.slot1 : names.slot2,
    bib: index === 1 ? input.bibs.slot1 : input.bibs.slot2,
    average: m.avg(sideAverage(players)),
    score: index === 1 ? input.score.slot1 : input.score.slot2,
    won,
  });
  const scorersOf = (players: BoardPlayer[]): PlayedScorer[] =>
    players
      .filter((player) => player.goals > 0)
      .sort((left, right) => right.goals - left.goals)
      .map((player) => ({
        userId: player.userId,
        name: player.isViewer ? messages.common.you : shortName(player.name),
        isYou: player.isViewer,
        count: `×${player.goals}`,
      }));
  const scorersA = scorersOf(slot1);
  const scorersB = scorersOf(slot2);

  const viewer = input.players.find((player) => player.isViewer) ?? null;
  const viewerSide = viewer?.sideIndex ?? null;
  const viewerWon =
    viewerSide === 1 ? slot1Won : viewerSide === 2 ? slot2Won : false;
  const youWord = playedWord(viewerWon, hasWinner);
  const you: PlayedYouLine | null =
    viewer && viewerSide
      ? {
          line: (() => {
            const team = viewerSide === 1 ? names.slot1 : names.slot2;
            const code = slotCode(viewer, locale);
            return code ? m.playedCodeFor(code, team) : m.playedFor(team);
          })(),
          ratingLine: input.stoodUnconfirmed
            ? messages.rating.publicGame.stood
            : playedRatingLine(input.rated, input.ratingImpact, locale),
          tag: youTag(youWord),
          won: viewerWon,
        }
      : null;

  const column = (
    key: "a" | "b",
    index: 1 | 2,
    players: BoardPlayer[],
    won: boolean,
  ): PlayedColumn => ({
    key,
    title: index === 1 ? names.slot1 : names.slot2,
    word: playedWord(won, hasWinner),
    won,
    fill: "paper",
    bib: index === 1 ? input.bibs.slot1 : input.bibs.slot2,
    players: players.map((player) => footballRow(player, locale)),
  });

  const facts: PlayedFact[] = [
    ...(input.groupName ? [{ label: m.group, value: input.groupName }] : []),
    ...(input.enteredByName
      ? [{ label: m.score, value: m.enteredBy(input.enteredByName) }]
      : []),
    {
      label: m.confirmed,
      value: input.stoodUnconfirmed
        ? messages.rating.publicGame.notInTime
        : input.confirmed.slot1 && input.confirmed.slot2
          ? m.byBothSides
          : m.byTheOrganizer,
    },
    {
      label: m.teams,
      value: footballTeamsMethodLabel(input.teamsMethod, locale),
    },
    {
      label: m.bibs,
      value: m.bibsLine(names.slot1, names.slot2),
    },
    {
      label: m.countsForRatingLabel,
      value:
        input.rated && !input.stoodUnconfirmed
          ? messages.common.yes
          : messages.common.no,
    },
  ];

  return {
    dateLine: playedDateLine(input.windowStart, locale),
    tag: input.sideSize
      ? sideSizeLabel(input.sideSize, locale).toUpperCase()
      : null,
    board: [side(1, slot1, slot1Won), side(2, slot2, slot2Won)],
    scorers:
      scorersA.length + scorersB.length > 0
        ? { a: scorersA, b: scorersB }
        : null,
    result: {
      line: footballResultLine(input.score, names, locale),
      hasWinner,
    },
    venueLine: playedVenueLine(input, locale),
    whenLine: playedWhenLine(input, locale),
    you,
    columns: [column("a", 1, slot1, slot1Won), column("b", 2, slot2, slot2Won)],
    unplaced: input.players
      .filter((player) => player.sideIndex == null)
      .map((player) => footballRow(player, locale)),
    facts,
  };
}

/**
 * Once a Game has been played, join and leave go; the Organizer still adds
 * and removes players so the record is right.
 */
export function gameIsPlayed(
  game: {
    windowEnd: Date | null;
    matches?: readonly { status: string | null }[];
  },
  now: Date,
) {
  if (game.matches?.some((match) => match.status === "completed")) {
    return true;
  }
  return game.windowEnd != null && game.windowEnd.getTime() < now.getTime();
}
