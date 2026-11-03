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
import { formatDayMonth, formatGameClock } from "./format-game-start";
import type { FriendlyGameDetailsSide } from "./friendly-game-details";
import type { FriendlyGameHeroMatch } from "./friendly-game-hero";
import { sideSizeLabel } from "./game-shape";
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

export function playedDateLine(windowStart: Date | null) {
  return windowStart
    ? `Played, ${formatDayMonth(windowStart, { weekday: "short" })}`
    : "Played";
}

export function playedDurationLabel(
  windowStart: Date | null,
  windowEnd: Date | null,
) {
  if (!windowStart || !windowEnd) {
    return null;
  }
  const minutes = Math.round(
    (windowEnd.getTime() - windowStart.getTime()) / 60_000,
  );
  return minutes >= 1 ? `${minutes} min` : null;
}

/** "Padel Hub, Court 3" */
export function playedVenueLine(place: PlayedPlace) {
  const line = [place.venue?.name, place.courtName].filter(Boolean).join(", ");
  return line || null;
}

/** "8:00 PM, 90 min, Janabiyah" */
export function playedWhenLine(place: PlayedPlace) {
  const line = [
    place.windowStart ? formatGameClock(place.windowStart) : null,
    playedDurationLabel(place.windowStart, place.windowEnd),
    place.venue?.city,
  ]
    .filter(Boolean)
    .join(", ");
  return line || null;
}

export function playedRatingLine(
  rated: boolean,
  impact: PlayedRatingImpact | null,
) {
  if (!rated) {
    return "Friendly, does not count for rating";
  }
  if (!impact) {
    return "Counts for rating";
  }
  const band = displayLabelFromStoredBand(impact.newLevelBand);
  const move =
    impact.levelChange > 0
      ? "moves up"
      : impact.levelChange < 0
        ? "moves down"
        : "holds";
  return `Counts for rating, ${band} ${move}`;
}

export function playedWord(won: boolean, hasWinner: boolean): PlayedWord {
  return won ? "Won" : hasWinner ? "Lost" : "Draw";
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
  style: "short" | "first" = "short",
) {
  if (!side) {
    return "Open";
  }
  const label = (seat: PadelSeat | null) => {
    if (!seat) {
      return "Open";
    }
    if (seat.userId === viewerUserId) {
      return "You";
    }
    return style === "first" ? firstName(seat.name) : shortName(seat.name);
  };
  const ordered =
    side.right?.userId === viewerUserId
      ? [side.right, side.left]
      : [side.left, side.right];
  return ordered.map(label).join(" & ");
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
): PlayedRow[] {
  if (!side) {
    return [];
  }
  return (["left", "right"] as const).flatMap((position) => {
    const seat = side[position];
    if (!seat) {
      return [];
    }
    const isYou = seat.userId === viewerUserId;
    return [
      {
        userId: seat.userId,
        name: isYou ? "You" : shortName(seat.name),
        fullName: seat.name,
        image: seat.image,
        isYou,
        meta: position.toUpperCase(),
        level: levelLabel(seat.levelBand),
        trailing: null,
        unclaimed: Boolean(seat.unclaimed),
        phoneMasked: seat.phoneMasked ?? null,
      },
    ];
  });
}

export function playedPadelModel(input: PlayedPadelInput): PlayedPadelModel {
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
    line: padelPairLine(side, input.viewerUserId),
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
    ? `${padelPairLine(winner, input.viewerUserId, "first")} win ${winnerSetWins}–${loserSetWins} in sets`
    : result === "draw"
      ? "Draw, both sides level"
      : "No result";

  const viewerSide = viewerPlayed ? a : null;
  const partner = viewerSide
    ? seatsOf(viewerSide).find((seat) => seat.userId !== input.viewerUserId)
    : undefined;
  const youWord = playedWord(aWon, hasWinner);
  const you: PlayedYouLine | null = viewerSide
    ? {
        line: partner
          ? `You played with ${shortName(partner.name)}`
          : "You played alone",
        ratingLine: playedRatingLine(input.rated, input.ratingImpact),
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
        ? "Your pair"
        : "Opponents"
      : side
        ? formatGameSideLabel("friendly_game", side.sideIndex)
        : "Open",
    word: playedWord(won, hasWinner),
    won,
    fill: key === "a" ? "ink" : "paper",
    bib: null,
    players: padelRows(side, input.viewerUserId),
  });

  const facts: PlayedFact[] = [
    ...(input.groupName ? [{ label: "Group", value: input.groupName }] : []),
    {
      label: "Confirmed",
      value: input.confirmation?.confirmedByOrganizer
        ? "By the organizer"
        : "By both pairs",
    },
    {
      label: "Format",
      value: pairs.length === 1 ? "1 set" : `${pairs.length} sets`,
    },
    { label: "Counts for rating", value: input.rated ? "Yes" : "No" },
  ];

  return {
    dateLine: playedDateLine(input.windowStart),
    tag: "PADEL",
    setLabels: pairs.map((_, index) => `S${index + 1}`),
    board: [row(a, slotA, aWon), row(b, slotB, bWon)],
    result: { line: resultLine, hasWinner },
    venueLine: playedVenueLine(input),
    whenLine: playedWhenLine(input),
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

export function goalsLabel(goals: number) {
  return goals === 1 ? "1 goal" : `${goals} goals`;
}

function footballRow(player: BoardPlayer): PlayedRow {
  return {
    userId: player.userId,
    name: player.isViewer ? "You" : shortName(player.name),
    fullName: player.name,
    image: player.image,
    isYou: player.isViewer,
    meta: slotCode(player),
    level: levelLabel(player.levelBand),
    trailing: player.goals > 0 ? goalsLabel(player.goals) : null,
    unclaimed: Boolean(player.unclaimed),
    phoneMasked: player.phoneMasked ?? null,
  };
}

export function footballResultLine(
  score: { slot1: number; slot2: number },
  names: { slot1: string; slot2: string },
) {
  if (score.slot1 === score.slot2) {
    return "Draw, both sides level";
  }
  const winner = score.slot1 > score.slot2 ? names.slot1 : names.slot2;
  return `${winner} win by ${Math.abs(score.slot1 - score.slot2)}`;
}

export function playedFootballModel(
  input: PlayedFootballInput,
): PlayedFootballModel {
  const names = bibNames(input.bibs);
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
    average: `avg ${sideAverage(players)}`,
    score: index === 1 ? input.score.slot1 : input.score.slot2,
    won,
  });
  const scorersOf = (players: BoardPlayer[]): PlayedScorer[] =>
    players
      .filter((player) => player.goals > 0)
      .sort((left, right) => right.goals - left.goals)
      .map((player) => ({
        userId: player.userId,
        name: player.isViewer ? "You" : shortName(player.name),
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
            const code = slotCode(viewer);
            return code
              ? `You played ${code} for ${team}`
              : `You played for ${team}`;
          })(),
          ratingLine: playedRatingLine(input.rated, input.ratingImpact),
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
    players: players.map(footballRow),
  });

  const facts: PlayedFact[] = [
    ...(input.groupName ? [{ label: "Group", value: input.groupName }] : []),
    ...(input.enteredByName
      ? [{ label: "Score", value: `Entered by ${input.enteredByName}` }]
      : []),
    {
      label: "Confirmed",
      value:
        input.confirmed.slot1 && input.confirmed.slot2
          ? "By both sides"
          : "By the organizer",
    },
    { label: "Teams", value: footballTeamsMethodLabel(input.teamsMethod) },
    {
      label: "Bibs",
      value: `${names.slot1} and ${names.slot2}, organizer brings`,
    },
    { label: "Counts for rating", value: input.rated ? "Yes" : "No" },
  ];

  return {
    dateLine: playedDateLine(input.windowStart),
    tag: input.sideSize ? sideSizeLabel(input.sideSize).toUpperCase() : null,
    board: [side(1, slot1, slot1Won), side(2, slot2, slot2Won)],
    scorers:
      scorersA.length + scorersB.length > 0
        ? { a: scorersA, b: scorersB }
        : null,
    result: { line: footballResultLine(input.score, names), hasWinner },
    venueLine: playedVenueLine(input),
    whenLine: playedWhenLine(input),
    you,
    columns: [column("a", 1, slot1, slot1Won), column("b", 2, slot2, slot2Won)],
    unplaced: input.players
      .filter((player) => player.sideIndex == null)
      .map(footballRow),
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
