import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import {
  formatGameClock,
  formatGameDay,
  formatRelativeDay,
  gameDayProximity,
} from "./format-game-start";
import { gameFormatLabel } from "./game-format-label";
import { formatHomeCountdown, formatHomeKickoff } from "./home-countdown";
import type {
  MyTournament,
  MyTournamentPair,
  MyTournamentRound,
} from "./hub-game-row";
import { shortPlayerName } from "./player-name";
import type { MatchOutcome } from "./result-mark";
import { sportLabel } from "./sport";
import { tournamentMatchupName } from "./tournament-card";

/**
 * One Games list card per Groups only tournament (ADR-0074). The rounds are
 * cells inside it; each Pool Match still counts on its own everywhere else.
 */
export function isTournamentGamesCardRow(row: {
  myTournament?: MyTournament | null;
}): row is { myTournament: MyTournament } {
  return row.myTournament != null;
}

export type TournamentRoundCellState =
  | MatchOutcome
  | "cancelled"
  | "no_score"
  | "on_court"
  | "next"
  | "later";

export type TournamentRoundCell = {
  matchId: string;
  label: string;
  state: TournamentRoundCellState;
  /** `Next`, `On court`, the score from the viewer's side, `no score`. */
  stateLine: string | null;
  opponentNames: string[];
  /** Not yet played, or played without a score. */
  hatched: boolean;
  accessibilityLabel: string;
};

/** Where a card action lands; each App maps it to its own route. */
export type TournamentGamesCardTarget = "tournament" | "results";

export type TournamentGamesCardAction = {
  label: string;
  target: TournamentGamesCardTarget;
};

function byRoundOrder(left: MyTournamentRound, right: MyTournamentRound) {
  const leftRound = left.roundNumber ?? Number.MAX_SAFE_INTEGER;
  const rightRound = right.roundNumber ?? Number.MAX_SAFE_INTEGER;
  if (leftRound !== rightRound) {
    return leftRound - rightRound;
  }
  const leftTime = left.startTime?.getTime() ?? 0;
  const rightTime = right.startTime?.getTime() ?? 0;
  return leftTime - rightTime || left.matchId.localeCompare(right.matchId);
}

function isOpen(round: MyTournamentRound) {
  return !round.completed && !round.cancelled;
}

function settledState(
  round: MyTournamentRound,
): TournamentRoundCellState | null {
  if (round.cancelled) {
    return "cancelled";
  }
  if (round.completed) {
    return round.outcome ?? "no_score";
  }
  return null;
}

/**
 * While the tournament runs, the latest open Round that has started is on
 * court, earlier open ones wait for a score, and the first open Round after
 * that is next. Once it is over, every open Round has no score.
 */
function roundStates(
  rounds: readonly MyTournamentRound[],
  options: { now: Date; over: boolean },
): TournamentRoundCellState[] {
  if (options.over) {
    return rounds.map((round) => settledState(round) ?? "no_score");
  }
  const now = options.now.getTime();
  let onCourtIndex = -1;
  rounds.forEach((round, index) => {
    if (
      isOpen(round) &&
      round.startTime != null &&
      round.startTime.getTime() <= now
    ) {
      onCourtIndex = index;
    }
  });
  const nextIndex = rounds.findIndex(
    (round, index) => index > onCourtIndex && isOpen(round),
  );
  return rounds.map((round, index) => {
    const settled = settledState(round);
    if (settled) {
      return settled;
    }
    if (index === onCourtIndex) {
      return "on_court";
    }
    if (index < onCourtIndex) {
      return "no_score";
    }
    return index === nextIndex ? "next" : "later";
  });
}

function scoreLine(round: MyTournamentRound) {
  return round.viewerSets
    .map((set) => `${set.viewer}–${set.opponent}`)
    .join(" ");
}

function pairNames(pair: MyTournamentPair) {
  return [pair.left, pair.right].flatMap((occupant) =>
    occupant ? [shortPlayerName(occupant.name)] : [],
  );
}

function pairLabel(pair: MyTournamentPair, locale: Locale) {
  return tournamentMatchupName(pair, locale) ?? "";
}

function stateLine(
  state: TournamentRoundCellState,
  round: MyTournamentRound,
  locale: Locale,
) {
  const m = messagesFor(locale).tournament.gamesCard;
  switch (state) {
    case "won":
    case "lost":
    case "draw":
      return scoreLine(round) || null;
    case "cancelled":
      return m.cancelled;
    case "no_score":
      return m.noScore;
    case "on_court":
      return m.onCourt;
    case "next":
      return m.next;
    case "later":
      return null;
  }
}

function stateWord(
  state: TournamentRoundCellState,
  round: MyTournamentRound,
  locale: Locale,
) {
  const m = messagesFor(locale).tournament.gamesCard;
  const score = scoreLine(round);
  switch (state) {
    case "won":
      return m.cellWon(score);
    case "lost":
      return m.cellLost(score);
    case "draw":
      return m.cellDrew(score);
    case "later":
      return m.later;
    default:
      return stateLine(state, round, locale) ?? "";
  }
}

function roundShortLabel(
  round: MyTournamentRound,
  index: number,
  locale: Locale,
) {
  return messagesFor(locale).tournament.card.roundShort(
    round.roundNumber ?? index + 1,
  );
}

function roundFullLabel(
  round: MyTournamentRound,
  index: number,
  locale: Locale,
) {
  return messagesFor(locale).tournament.card.roundN(
    round.roundNumber ?? index + 1,
  );
}

type CellRound = { round: MyTournamentRound; state: TournamentRoundCellState };

function cellRounds(
  tournament: MyTournament,
  options: { now: Date; over: boolean },
): CellRound[] {
  const rounds = [...tournament.rounds].sort(byRoundOrder);
  const states = roundStates(rounds, options);
  return rounds.map((round, index) => ({ round, state: states[index]! }));
}

function toCells(rounds: readonly CellRound[], locale: Locale) {
  return rounds.map(({ round, state }, index): TournamentRoundCell => {
    const m = messagesFor(locale).tournament.gamesCard;
    return {
      matchId: round.matchId,
      label: roundShortLabel(round, index, locale),
      state,
      stateLine: stateLine(state, round, locale),
      opponentNames: pairNames(round.opponent),
      hatched: state === "next" || state === "later" || state === "no_score",
      accessibilityLabel: m.cellLabel(
        roundFullLabel(round, index, locale),
        stateWord(state, round, locale),
        pairLabel(round.opponent, locale),
      ),
    };
  });
}

function placeLabel(position: number, locale: Locale) {
  return messagesFor(locale).tournament.gamesCard.place(position);
}

function teamLine(tournament: MyTournament, locale: Locale) {
  const m = messagesFor(locale).tournament;
  if (tournament.viewerPosition == null) {
    return m.card.groupTeams(tournament.poolLabel, tournament.poolSize);
  }
  const place = placeLabel(tournament.viewerPosition, locale);
  return tournament.poolFinished
    ? m.gamesCard.groupPlace(tournament.poolLabel, place, tournament.poolSize)
    : m.gamesCard.groupPlaceSoFar(
        tournament.poolLabel,
        place,
        tournament.poolSize,
      );
}

function venueLine(
  venueName: string | null | undefined,
  rounds: readonly MyTournamentRound[],
  locale: Locale,
) {
  const m = messagesFor(locale).tournament.gamesCard;
  const courts = [
    ...new Set(
      rounds.flatMap((round) => (round.courtName ? [round.courtName] : [])),
    ),
  ];
  if (!venueName) {
    return courts.length === 1 ? courts[0]! : null;
  }
  if (courts.length === 0) {
    return venueName;
  }
  return m.withCourt(
    venueName,
    courts.length === 1 ? courts[0]! : m.courtsCount(courts.length),
  );
}

function withCourt(line: string, court: string | null, locale: Locale) {
  return court
    ? messagesFor(locale).tournament.gamesCard.withCourt(line, court)
    : line;
}

function stepLine(
  rounds: readonly CellRound[],
  locale: Locale,
): { kind: "playing" | "first" | "next"; title: string; body: string } | null {
  const m = messagesFor(locale).tournament.gamesCard;
  const playing = rounds.find((item) => item.state === "on_court");
  const next = rounds.find((item) => item.state === "next");
  if (playing) {
    const nextOpponent = next ? pairLabel(next.round.opponent, locale) : "";
    return {
      kind: "playing",
      title: withCourt(
        m.playing(pairLabel(playing.round.opponent, locale)),
        playing.round.courtName,
        locale,
      ),
      body: !nextOpponent
        ? m.playingBody
        : next?.round.courtName
          ? m.playingBodyThenNextOnCourt(nextOpponent, next.round.courtName)
          : m.playingBodyThenNext(nextOpponent),
    };
  }
  if (!next) {
    return null;
  }
  const started = rounds.some(
    (item) => item.state !== "next" && item.state !== "later",
  );
  const title = withCourt(
    started
      ? m.nextUp(pairLabel(next.round.opponent, locale))
      : m.firstUp(pairLabel(next.round.opponent, locale)),
    next.round.courtName,
    locale,
  );
  const left = rounds.filter(
    (item) => item.state === "next" || item.state === "later",
  ).length;
  return {
    kind: started ? "next" : "first",
    title,
    body: started ? m.roundsToGo(left) : m.firstUpBody(rounds.length),
  };
}

function roundsMeta(
  rounds: readonly CellRound[],
  windowStart: Date | null,
  locale: Locale,
) {
  const m = messagesFor(locale).tournament.gamesCard;
  const played = rounds.filter(
    (item) =>
      item.state === "won" || item.state === "lost" || item.state === "draw",
  );
  if (played.length > 0) {
    return m.playedWon(
      played.length,
      played.filter((item) => item.state === "won").length,
    );
  }
  const today =
    windowStart != null && gameDayProximity(windowStart) === "today";
  return today ? m.roundsTonight(rounds.length) : m.roundsCount(rounds.length);
}

function headerStatus(
  rounds: readonly CellRound[],
  windowStart: Date | null,
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale).tournament.gamesCard;
  const current =
    rounds.find((item) => item.state === "on_court") ??
    rounds.find((item) => item.state === "next");
  const started =
    rounds.some((item) => item.state !== "next" && item.state !== "later") ||
    (windowStart != null && windowStart.getTime() <= now.getTime());
  if (!started && windowStart) {
    const countdown = formatHomeCountdown(windowStart, now, locale);
    if (countdown) {
      return countdown;
    }
  }
  if (!current) {
    return m.allRoundsPlayed;
  }
  const index = rounds.indexOf(current);
  return m.roundOfCount(current.round.roundNumber ?? index + 1, rounds.length);
}

export type TournamentGamesCardInput = {
  name: string | null;
  sport: string | null;
  format: string;
  startTime: Date;
  windowStart: Date | null;
  windowEnd: Date | null;
  venue: { name: string } | null;
  myTournament: MyTournament;
};

/** The upcoming and live card (design 1a to 1c). */
export function tournamentGamesCardModel(
  game: TournamentGamesCardInput,
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale).tournament.gamesCard;
  const tournament = game.myTournament;
  const rounds = cellRounds(tournament, { now, over: false });
  const start = game.windowStart ?? game.startTime;
  const kickoff = formatHomeKickoff(start, locale);
  const relativeDay = formatRelativeDay(start, locale);
  const proximity = gameDayProximity(start);
  const absoluteDay = formatGameDay(start, locale, {
    weekday: "long",
    month: "long",
  });
  const step = stepLine(rounds, locale);
  const scoring = rounds.some(
    (item) => item.state === "on_court" || item.state === "no_score",
  );
  return {
    sportLabel: sportLabel(game.sport, locale),
    formatLabel: gameFormatLabel(game.format, locale),
    status: headerStatus(rounds, game.windowStart, now, locale),
    dayLine:
      proximity === "later" ? absoluteDay : m.dayLine(relativeDay, absoluteDay),
    time: kickoff.time,
    meridiem: kickoff.meridiem,
    untilLine: game.windowEnd
      ? m.untilClock(formatGameClock(game.windowEnd, locale))
      : null,
    venueLine: venueLine(game.venue?.name, tournament.rounds, locale),
    viewerTeam: tournament.viewerTeam,
    teamName: pairLabel(tournament.viewerTeam, locale),
    teamLine: teamLine(tournament, locale),
    roundsTitle: m.yourRounds,
    roundsMeta: roundsMeta(rounds, game.windowStart, locale),
    cells: toCells(rounds, locale),
    step,
    secondary: (scoring
      ? { label: m.tournament, target: "tournament" }
      : {
          label: m.details,
          target: "tournament",
        }) satisfies TournamentGamesCardAction,
    primary: (scoring
      ? { label: m.enterScore, target: "results" }
      : {
          label: m.viewTournament,
          target: "results",
        }) satisfies TournamentGamesCardAction,
    scoring,
  };
}

export type TournamentPlayedCardInput = {
  name: string | null;
  format: string;
  displayTime: Date;
  windowStart: Date | null;
  venue: { name: string } | null;
  myTournament: MyTournament;
};

function partnerName(pair: MyTournamentPair) {
  const partner = [pair.left, pair.right].find(
    (occupant) => occupant != null && !occupant.isViewer,
  );
  return partner ? shortPlayerName(partner.name) : null;
}

/** The played card (design 2a to 2d): the place leads, one cell per Round. */
export function tournamentPlayedCardModel(
  game: TournamentPlayedCardInput,
  locale: Locale,
) {
  const messages = messagesFor(locale);
  const m = messages.tournament.gamesCard;
  const tournament = game.myTournament;
  const rounds = cellRounds(tournament, { now: new Date(0), over: true });
  const missing = rounds.filter((item) => item.state === "no_score");
  const won = rounds.filter((item) => item.state === "won").length;
  const lost = rounds.filter((item) => item.state === "lost").length;
  const drawn = rounds.filter((item) => item.state === "draw").length;
  const final = tournament.poolFinished && missing.length === 0;
  const partner = partnerName(tournament.viewerTeam);
  const context = [
    tournament.poolCount > 1
      ? m.ofTeamsInGroup(tournament.poolSize, tournament.poolLabel)
      : m.ofTeams(tournament.poolSize),
    final ? null : m.soFar,
    partner ? m.withPartner(partner) : null,
  ]
    .filter((part): part is string => part != null)
    .join(messages.common.listSeparator);
  const winnerIsViewer =
    tournament.winner?.left?.isViewer === true ||
    tournament.winner?.right?.isViewer === true;
  const summaryTail =
    missing.length > 0
      ? m.noScoreYet(missing.length)
      : final && tournament.winner && !winnerIsViewer
        ? m.wonIt(pairLabel(tournament.winner, locale))
        : null;
  const record = m.record(won, drawn, lost);
  const firstMissing = missing[0];
  const title = game.name ?? messages.tournament.details.fallbackName;
  const place = tournament.viewerPosition;
  return {
    bandLabel: gameFormatLabel(game.format, locale),
    day: formatGameDay(game.windowStart ?? game.displayTime, locale, {
      weekday: "short",
    }),
    venueLine: [title, game.venue?.name]
      .filter((part): part is string => Boolean(part))
      .map(messages.common.isolate)
      .join(messages.common.listSeparator),
    place: place != null ? placeLabel(place, locale) : null,
    context,
    summary: summaryTail ? `${record} ${summaryTail}` : record,
    cells: toCells(rounds, locale),
    missing:
      firstMissing == null
        ? null
        : {
            line:
              missing.length === 1
                ? m.roundHasNoScore(
                    roundShortLabel(
                      firstMissing.round,
                      rounds.indexOf(firstMissing),
                      locale,
                    ),
                  )
                : m.roundsHaveNoScore(missing.length),
            action: {
              label: m.addScore,
              target: "results",
            } satisfies TournamentGamesCardAction,
          },
  };
}
