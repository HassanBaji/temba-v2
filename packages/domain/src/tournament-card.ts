import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import { formatGameClock, formatGameDay } from "./format-game-start";
import { friendlyGameWaitlistOrdinal } from "./friendly-game-cta";
import {
  gameSummaryPrimaryAction,
  type GameSummaryCtaInput,
} from "./game-summary-cta";
import { nameInitial } from "./player-name";
import {
  knockoutMatchRoundName,
  knockoutRoundName,
  knockoutStartWord,
} from "./tournament-knockout";
import { isKingOfTheCourt, kingCourtCount } from "./tournament-king";
import { knockoutNowLine } from "./tournament-knockout-view";
import {
  hasKnockout,
  isDrawnTournament,
  isKnockoutOnly,
  poolRoundLabel,
} from "./tournament-rounds";
import { isOneDayTournamentWindow } from "./tournament-schedule";
import { roundCountLabel } from "./tournament-sizing";

export const TOURNAMENT_CARD_MAX_PAIRS = 4;

type Occupant = { name: string; isViewer: boolean } | null;

export type TournamentCardTeam = {
  isViewerTeam: boolean;
  poolIndex: number | null;
  left: Occupant;
  right: Occupant;
};

export type TournamentCardAction =
  | "join"
  | "join_waitlist"
  | "invite_partner"
  | "view";

export type TournamentCardKnockout = {
  roundCount: number | null;
  currentRoundName: string | null;
  champion: string | null;
};

export type TournamentCardInput = GameSummaryCtaInput & {
  registeredTeamCount: number;
  teamsAllowed: number | null;
  poolCount: number | null;
  tournamentShape: string | null;
  tournament: {
    drawPosted: boolean;
    teams: readonly TournamentCardTeam[];
    knockout?: TournamentCardKnockout | null;
  } | null;
};

/** One Knockout Match row: its Knockout round and how many the tree has. */
export type TournamentKnockoutMatch = { round: number; roundCount: number };

function knockoutMatchName(
  knockoutMatch: TournamentKnockoutMatch,
  locale: Locale,
) {
  return knockoutMatchRoundName(
    knockoutMatch.round,
    knockoutMatch.roundCount,
    locale,
  );
}

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

/** `Thu 25 Sep` */
function shortDay(date: Date, locale: Locale) {
  return formatGameDay(date, locale, { weekday: "short" });
}

export function tournamentCardDateLine(
  windowStart: Date | string | null | undefined,
  windowEnd: Date | string | null | undefined,
  locale: Locale,
): string | null {
  if (!windowStart) {
    return null;
  }
  const m = messagesFor(locale).tournament.card;
  const start = asDate(windowStart);
  if (!windowEnd) {
    return m.fromDay(shortDay(start, locale));
  }
  const end = asDate(windowEnd);
  if (isOneDayTournamentWindow(start, end)) {
    return m.dayWithHours(
      shortDay(start, locale),
      formatGameClock(start, locale),
      formatGameClock(end, locale),
    );
  }
  return m.dayRange(shortDay(start, locale), shortDay(end, locale));
}

/**
 * Pool Rounds only. A Knockout only tournament names its stage instead of
 * counting Rounds, since Knockout rounds are named, not numbered.
 */
export function tournamentCardBandMeta(
  roundCount: number | null | undefined,
  locale: Locale,
  game?: { format: string; tournamentShape: string | null },
) {
  const m = messagesFor(locale).tournament.card;
  if (game && isKingOfTheCourt(game.format, game.tournamentShape)) {
    return messagesFor(locale).tournamentKing.shape.title;
  }
  if (game && isKnockoutOnly(game.format, game.tournamentShape)) {
    return m.knockoutBandMeta;
  }
  if (roundCount == null) {
    return null;
  }
  const rounds = roundCountLabel(roundCount, locale);
  return game && hasKnockout(game.format, game.tournamentShape)
    ? m.roundsThenKnockout(rounds)
    : rounds;
}

function isFullTeam(team: TournamentCardTeam) {
  return team.left != null && team.right != null;
}

/** A half team still has an open Position, so it counts as open. */
export function tournamentOpenTeamCount(
  teamsAllowed: number | null | undefined,
  teams: readonly TournamentCardTeam[],
) {
  const full = teams.filter(isFullTeam).length;
  return Math.max(0, (teamsAllowed ?? 0) - full);
}

export function showsTournamentOpenFlag(game: TournamentCardInput) {
  return (
    game.tournament?.drawPosted !== true &&
    game.registrationStatus !== "closed" &&
    game.registrationStatus !== "cancelled"
  );
}

export function tournamentOpenFlagLabel(openTeams: number, locale: Locale) {
  const m = messagesFor(locale).tournament.card;
  return openTeams > 0 ? m.openCount(openTeams) : m.full;
}

export function tournamentTeamsLine(game: TournamentCardInput, locale: Locale) {
  const m = messagesFor(locale).tournament.card;
  const tournament = game.tournament;
  if (isKingOfTheCourt(game.format, game.tournamentShape)) {
    const teamCount = tournament?.drawPosted
      ? tournament.teams.length
      : (game.teamsAllowed ?? 0);
    return tournament?.drawPosted
      ? messagesFor(locale).tournamentKing.card.teamsCourts(
          teamCount,
          kingCourtCount(teamCount),
        )
      : m.teamsIn(game.registeredTeamCount, game.teamsAllowed ?? 0);
  }
  if (tournament?.drawPosted) {
    const drawn = tournament.teams.filter((team) => team.poolIndex != null);
    const teamCount = drawn.length > 0 ? drawn.length : tournament.teams.length;
    if (isKnockoutOnly(game.format, game.tournamentShape)) {
      return m.teamsKnockout(teamCount);
    }
    const groupCount =
      new Set(drawn.map((team) => team.poolIndex)).size ||
      (game.poolCount ?? 0);
    const knockoutRounds = tournament.knockout?.roundCount;
    return hasKnockout(game.format, game.tournamentShape) &&
      knockoutRounds != null
      ? m.teamsGroupsThen(
          teamCount,
          groupCount,
          knockoutStartWord(knockoutRounds, locale),
        )
      : m.teamsGroups(teamCount, groupCount);
  }
  return m.teamsIn(game.registeredTeamCount, game.teamsAllowed ?? 0);
}

/**
 * After the draw of a tournament with a Knockout: the Champion once the
 * Final is decided, else the Knockout round now being played. Null on a
 * Groups only tournament.
 */
export function tournamentCardKnockoutLine(
  game: TournamentCardInput,
  locale: Locale,
) {
  const knockout = game.tournament?.knockout;
  if (
    !game.tournament?.drawPosted ||
    !knockout ||
    !hasKnockout(game.format, game.tournamentShape)
  ) {
    return null;
  }
  if (knockout.champion) {
    return messagesFor(locale).tournament.knockoutView.championLine(
      knockout.champion,
    );
  }
  return knockout.currentRoundName
    ? knockoutNowLine(knockout.currentRoundName, locale)
    : null;
}

export function tournamentCardPairs<T extends TournamentCardTeam>(
  teams: readonly T[],
  {
    teamsAllowed,
    registrationOpen,
  }: { teamsAllowed?: number | null; registrationOpen?: boolean } = {},
) {
  const occupied = teams.filter(
    (team) => team.left != null || team.right != null,
  );
  const shown = occupied.slice(0, TOURNAMENT_CARD_MAX_PAIRS);
  const emptyTeams = registrationOpen
    ? Math.max(0, (teamsAllowed ?? 0) - occupied.length)
    : 0;
  return {
    shown,
    remaining: occupied.length - shown.length,
    placeholders: Math.min(
      TOURNAMENT_CARD_MAX_PAIRS - shown.length,
      emptyTeams,
    ),
  };
}

function viewerTeamIsHalf(teams: readonly TournamentCardTeam[]) {
  const mine = teams.find((team) => team.isViewerTeam);
  return mine != null && !isFullTeam(mine);
}

export function tournamentCardAction(
  game: TournamentCardInput,
): TournamentCardAction {
  const primary = gameSummaryPrimaryAction(game);
  if (primary === "join" || primary === "join_waitlist") {
    return primary;
  }
  if (
    game.tournament != null &&
    !game.tournament.drawPosted &&
    game.registrationStatus !== "closed" &&
    game.registrationStatus !== "cancelled" &&
    viewerTeamIsHalf(game.tournament.teams)
  ) {
    return "invite_partner";
  }
  return "view";
}

export function tournamentCardActionLabel(
  action: TournamentCardAction,
  locale: Locale,
) {
  const m = messagesFor(locale).tournament.card;
  switch (action) {
    case "join":
      return m.joinAction;
    case "join_waitlist":
      return m.joinWaitlistAction;
    case "invite_partner":
      return m.invitePartnerAction;
    case "view":
      return m.viewAction;
  }
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function occupantName(occupant: Occupant, locale: Locale) {
  const m = messagesFor(locale);
  if (!occupant) {
    return m.tournament.card.openSeat;
  }
  return occupant.isViewer ? m.common.you : firstName(occupant.name);
}

export function tournamentTeamPairLabel(
  team: TournamentCardTeam,
  locale: Locale,
) {
  return messagesFor(locale).tournament.card.pair(
    occupantName(team.left, locale),
    occupantName(team.right, locale),
  );
}

export type TournamentPoolMatch = {
  poolLabel: string;
  poolSize: number;
  viewerPosition: number | null;
  lastResult: {
    roundNumber: number;
    outcome: "won" | "lost" | "draw" | "cancelled";
    viewerSets: readonly { viewer: number; opponent: number }[];
  } | null;
};

/** Band meta and Coming up tag: `R2 of 3` on a Pool Match, `Semi-final` on a Knockout Match. */
export function tournamentMatchRoundLabel(
  row: {
    roundNumber: number | null | undefined;
    roundCount: number | null | undefined;
    knockoutMatch?: TournamentKnockoutMatch | null;
  },
  locale: Locale,
) {
  if (row.knockoutMatch) {
    return knockoutMatchName(row.knockoutMatch, locale);
  }
  return poolRoundLabel(row.roundNumber, row.roundCount, locale);
}

export function tournamentMatchRoundLine(
  roundNumber: number | null | undefined,
  poolMatch: TournamentPoolMatch | null | undefined,
  locale: Locale,
  knockoutMatch?: TournamentKnockoutMatch | null,
) {
  if (knockoutMatch) {
    return knockoutMatchName(knockoutMatch, locale);
  }
  const m = messagesFor(locale).tournament.card;
  if (roundNumber != null && poolMatch) {
    return m.roundGroup(roundNumber, poolMatch.poolLabel);
  }
  if (roundNumber != null) {
    return m.roundN(roundNumber);
  }
  if (poolMatch) {
    return m.group(poolMatch.poolLabel);
  }
  return null;
}

export function tournamentMatchVenueLine(
  venueName: string | null | undefined,
  courtName: string | null | undefined,
  locale: Locale,
) {
  const { common } = messagesFor(locale);
  const line = [venueName, courtName]
    .filter((part): part is string => Boolean(part))
    .map(common.isolate)
    .join(common.listSeparator);
  return line.length > 0 ? line : null;
}

export function tournamentMatchStandingLine(
  poolMatch: TournamentPoolMatch | null | undefined,
  locale: Locale,
) {
  if (!poolMatch) {
    return null;
  }
  const m = messagesFor(locale).tournament.card;
  if (poolMatch.viewerPosition != null) {
    return m.ordinalInGroup(
      friendlyGameWaitlistOrdinal(poolMatch.viewerPosition),
      poolMatch.poolLabel,
    );
  }
  return m.groupTeams(poolMatch.poolLabel, poolMatch.poolSize);
}

export function tournamentMatchLastResultLine(
  lastResult: TournamentPoolMatch["lastResult"] | undefined,
  locale: Locale,
) {
  if (!lastResult) {
    return null;
  }
  const m = messagesFor(locale).tournament.card;
  const round = m.roundShort(lastResult.roundNumber);
  const score = lastResult.viewerSets
    .map((set) => `${set.viewer}–${set.opponent}`)
    .join(" ");
  switch (lastResult.outcome) {
    case "cancelled":
      return m.roundCancelled(round);
    case "draw":
      return m.drewRound(round);
    case "won":
      return score ? m.wonRoundScore(round, score) : m.wonRound(round);
    case "lost":
      return score ? m.lostRoundScore(round, score) : m.lostRound(round);
  }
}

function capitalize(line: string) {
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** Home: `Round 2, tonight`, `Semi-final, tonight`, or the day word alone. */
export function tournamentMatchHeadline(
  roundNumber: number | null | undefined,
  relativeDay: string,
  locale: Locale,
  knockoutMatch?: TournamentKnockoutMatch | null,
) {
  const m = messagesFor(locale).tournament.card;
  if (knockoutMatch) {
    return m.knockoutHeadline(
      knockoutMatchName(knockoutMatch, locale),
      relativeDay,
    );
  }
  return roundNumber != null
    ? m.headline(roundNumber, relativeDay)
    : capitalize(relativeDay);
}

/** Home: `7:30 PM, Padelhuset Bromma`. The court gets its own line. */
export function tournamentMatchKickoffLine(
  kickoff: { time: string; meridiem: string },
  venueName: string | null | undefined,
  locale: Locale,
) {
  const { common } = messagesFor(locale);
  const clock = [kickoff.time, kickoff.meridiem].filter(Boolean).join(" ");
  return [clock, venueName ? common.isolate(venueName) : null]
    .filter(Boolean)
    .join(common.listSeparator);
}

export function tournamentMatchGroupLabel(
  poolMatch: TournamentPoolMatch | null | undefined,
  locale: Locale,
) {
  return poolMatch
    ? messagesFor(locale).tournament.card.group(poolMatch.poolLabel)
    : null;
}

function lastResultPhrase(
  lastResult: TournamentPoolMatch["lastResult"],
  locale: Locale,
) {
  if (!lastResult) {
    return null;
  }
  const m = messagesFor(locale).tournament.card;
  const round = m.roundShort(lastResult.roundNumber);
  const score = lastResult.viewerSets
    .map((set) => `${set.viewer}–${set.opponent}`)
    .join(" ");
  switch (lastResult.outcome) {
    case "cancelled":
      return m.roundCancelled(round);
    case "draw":
      return m.standingDrew(round);
    case "won":
      return score ? m.standingWonScore(round, score) : m.standingWon(round);
    case "lost":
      return score ? m.standingLostScore(round, score) : m.standingLost(round);
  }
}

/** Home: `2nd, won R1 6–3 6–4`; the group size before the viewer's team has played. */
export function tournamentMatchGroupStanding(
  poolMatch: TournamentPoolMatch | null | undefined,
  locale: Locale,
) {
  if (!poolMatch) {
    return null;
  }
  const m = messagesFor(locale).tournament;
  const parts = [
    poolMatch.viewerPosition != null
      ? friendlyGameWaitlistOrdinal(poolMatch.viewerPosition)
      : null,
    lastResultPhrase(poolMatch.lastResult, locale),
  ].filter((part): part is string => part != null);
  if (parts.length === 0) {
    return m.card.teamsCount(poolMatch.poolSize);
  }
  return capitalize(parts.join(m.listSeparator));
}

/**
 * Home footer. Counts the Pool Rounds left; the last Pool Round hands over
 * to the knockout when the tournament has one. A Knockout Match names what
 * its winner plays next.
 */
export function tournamentMatchRoundsLeftLine(
  roundNumber: number | null | undefined,
  roundCount: number | null | undefined,
  locale: Locale,
  options: {
    knockoutMatch?: TournamentKnockoutMatch | null;
    thenKnockout?: boolean;
  } = {},
) {
  const m = messagesFor(locale).tournament.card;
  const { knockoutMatch } = options;
  if (knockoutMatch) {
    if (knockoutMatch.round >= knockoutMatch.roundCount) {
      return m.winnerIsChampion;
    }
    return m.winnerPlays(
      knockoutRoundName(
        knockoutMatch.round + 1,
        knockoutMatch.roundCount,
        locale,
      ),
    );
  }
  if (roundNumber == null || roundCount == null) {
    return null;
  }
  const left = roundCount - roundNumber;
  if (left <= 0) {
    return options.thenKnockout ? m.thenKnockout : m.lastRound;
  }
  return m.thenMoreRounds(left);
}

type MatchupSide = { left: Occupant; right: Occupant };

function sideHasViewer(side: MatchupSide) {
  return side.left?.isViewer === true || side.right?.isViewer === true;
}

/** The viewer's Game team first, then the opposing team. */
export function tournamentMatchup<T extends MatchupSide>(
  sides: readonly T[],
): { viewer: T | null; opponent: T | null } {
  const viewer = sides.find(sideHasViewer) ?? null;
  const opponent = sides.find((side) => side !== viewer) ?? null;
  return { viewer, opponent };
}

/** `Sofia Lindqvist` → `Sofia L` */
function shortPlayerName(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? name;
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  return last ? `${first} ${nameInitial(last) ?? ""}` : first;
}

/** Vacant Positions are left out: the draw has already fixed who plays. */
export function tournamentMatchupName(
  side: MatchupSide | null,
  locale: Locale,
) {
  if (!side) {
    return null;
  }
  const m = messagesFor(locale);
  const occupants = [side.left, side.right].filter(
    (occupant): occupant is NonNullable<Occupant> => occupant != null,
  );
  const names = occupants
    .filter((occupant) => !occupant.isViewer)
    .map((occupant) => shortPlayerName(occupant.name));
  if (sideHasViewer(side)) {
    names.unshift(m.common.you);
  }
  const [first, second] = names;
  if (first == null) {
    return null;
  }
  return second == null ? first : m.tournament.card.pair(first, second);
}

export type TournamentMatchPhase = "upcoming" | "ongoing" | "needs_results";

/** An expanded Pool Match or Knockout Match row of a drawn tournament. */
export function isTournamentMatchRow(row: {
  format: string;
  poolCount: number | null;
  tournamentShape?: string | null;
  matchId: string | null;
}) {
  return (
    row.matchId != null &&
    isDrawnTournament(row.format, row.poolCount, row.tournamentShape)
  );
}

/** Before the draw, or drawn without the viewer on an open Match: one row for the whole tournament. */
export function isDrawnTournamentSummaryRow(row: {
  format: string;
  poolCount: number | null;
  tournamentShape: string | null;
  matchId: string | null;
}) {
  return (
    row.matchId == null &&
    isDrawnTournament(row.format, row.poolCount, row.tournamentShape)
  );
}

/** Without a Home phase (My Games), the card counts down to kickoff. */
export function tournamentMatchStatus(
  phase: TournamentMatchPhase | undefined,
  countdown: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).tournament.card;
  switch (phase) {
    case "ongoing":
      return m.playingNow;
    case "needs_results":
      return m.addResults;
    default:
      return countdown;
  }
}

export type TournamentMatchAction = "add_results" | "view";

export function tournamentMatchAction(
  phase: TournamentMatchPhase | undefined,
  canAddResults: boolean,
): TournamentMatchAction {
  return phase === "needs_results" && canAddResults ? "add_results" : "view";
}

export function tournamentMatchActionLabel(
  action: TournamentMatchAction,
  locale: Locale,
) {
  return action === "add_results"
    ? messagesFor(locale).tournament.card.addResults
    : tournamentCardActionLabel("view", locale);
}

/** After the draw the Game opens on the viewer's group table, or on the Knockout. */
export function homeTournamentMatchActionLabel(
  action: TournamentMatchAction,
  locale: Locale,
  knockoutMatch?: TournamentKnockoutMatch | null,
) {
  const m = messagesFor(locale).tournament.card;
  if (action === "add_results") {
    return tournamentMatchActionLabel(action, locale);
  }
  return knockoutMatch ? m.viewKnockout : m.viewGroup;
}
