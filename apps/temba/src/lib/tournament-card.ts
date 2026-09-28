import { formatGameClock } from "~/lib/format-game-start";
import { friendlyGameWaitlistOrdinal } from "~/lib/friendly-game-cta";
import {
  gameSummaryPrimaryAction,
  type GameSummaryCtaInput,
} from "~/lib/game-summary-cta";
import { isOneDayTournamentWindow } from "~/lib/tournament-schedule";
import { roundCountLabel } from "~/lib/tournament-sizing";

export const TOURNAMENT_CARD_BAND_LABEL = "Friendly tournament";
export const TOURNAMENT_MATCH_CARD_BAND_LABEL = "Your tournament";
export const TOURNAMENT_CARD_MAX_PAIRS = 4;
export const NO_TEAMS_YET_COPY = "No teams yet";

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

export type TournamentCardInput = GameSummaryCtaInput & {
  registeredTeamCount: number;
  teamsAllowed: number | null;
  poolCount: number | null;
  tournament: {
    drawPosted: boolean;
    teams: readonly TournamentCardTeam[];
  } | null;
};

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

/** `Thu 25 Sep` */
function shortDay(date: Date) {
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${weekday} ${date.getDate()} ${month}`;
}

export function tournamentCardDateLine(
  windowStart: Date | string | null | undefined,
  windowEnd: Date | string | null | undefined,
): string | null {
  if (!windowStart) {
    return null;
  }
  const start = asDate(windowStart);
  if (!windowEnd) {
    return `From ${shortDay(start)}`;
  }
  const end = asDate(windowEnd);
  if (isOneDayTournamentWindow(start, end)) {
    return `${shortDay(start)}, ${formatGameClock(start)} – ${formatGameClock(end)}`;
  }
  return `${shortDay(start)} to ${shortDay(end)}`;
}

export function tournamentCardBandMeta(roundCount: number | null | undefined) {
  return roundCount == null ? null : roundCountLabel(roundCount);
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

export function tournamentOpenFlagLabel(openTeams: number) {
  return openTeams > 0 ? `${openTeams} open` : "Full";
}

export function tournamentTeamsLine(game: TournamentCardInput) {
  const tournament = game.tournament;
  if (tournament?.drawPosted) {
    const drawn = tournament.teams.filter((team) => team.poolIndex != null);
    const teamCount = drawn.length > 0 ? drawn.length : tournament.teams.length;
    const groupCount =
      new Set(drawn.map((team) => team.poolIndex)).size ||
      (game.poolCount ?? 0);
    return `${teamCount} ${teamCount === 1 ? "team" : "teams"}, ${groupCount} ${
      groupCount === 1 ? "group" : "groups"
    }`;
  }
  return `${game.registeredTeamCount} of ${game.teamsAllowed ?? 0} teams in`;
}

export function tournamentCardPairs<T extends TournamentCardTeam>(
  teams: readonly T[],
) {
  const occupied = teams.filter(
    (team) => team.left != null || team.right != null,
  );
  const shown = occupied.slice(0, TOURNAMENT_CARD_MAX_PAIRS);
  return { shown, remaining: occupied.length - shown.length };
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
    !game.joinFrozen &&
    game.registrationStatus !== "closed" &&
    game.registrationStatus !== "cancelled" &&
    viewerTeamIsHalf(game.tournament.teams)
  ) {
    return "invite_partner";
  }
  return "view";
}

export function tournamentCardActionLabel(action: TournamentCardAction) {
  switch (action) {
    case "join":
      return "Join tournament";
    case "join_waitlist":
      return "Join waitlist";
    case "invite_partner":
      return "Invite a partner";
    case "view":
      return "View tournament";
  }
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function occupantName(occupant: Occupant) {
  if (!occupant) {
    return "open seat";
  }
  return occupant.isViewer ? "You" : firstName(occupant.name);
}

export function tournamentTeamPairLabel(team: TournamentCardTeam) {
  return `${occupantName(team.left)} and ${occupantName(team.right)}`;
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

export function tournamentMatchRoundLine(
  roundNumber: number | null | undefined,
  poolMatch: TournamentPoolMatch | null | undefined,
) {
  const parts = [
    roundNumber != null ? `Round ${roundNumber}` : null,
    poolMatch ? `group ${poolMatch.poolLabel}` : null,
  ].filter((part): part is string => part != null);
  if (parts.length === 0) {
    return null;
  }
  const line = parts.join(", ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

export function tournamentMatchVenueLine(
  venueName: string | null | undefined,
  courtName: string | null | undefined,
) {
  const line = [venueName, courtName].filter(Boolean).join(", ");
  return line.length > 0 ? line : null;
}

export function tournamentMatchStandingLine(
  poolMatch: TournamentPoolMatch | null | undefined,
) {
  if (!poolMatch) {
    return null;
  }
  if (poolMatch.viewerPosition != null) {
    return `${friendlyGameWaitlistOrdinal(poolMatch.viewerPosition)} in group ${poolMatch.poolLabel}`;
  }
  return `Group ${poolMatch.poolLabel}, ${poolMatch.poolSize} ${
    poolMatch.poolSize === 1 ? "team" : "teams"
  }`;
}

export function tournamentMatchLastResultLine(
  lastResult: TournamentPoolMatch["lastResult"] | undefined,
) {
  if (!lastResult) {
    return null;
  }
  const round = `R${lastResult.roundNumber}`;
  const score = lastResult.viewerSets
    .map((set) => `${set.viewer}-${set.opponent}`)
    .join(" ");
  switch (lastResult.outcome) {
    case "cancelled":
      return `${round} cancelled`;
    case "draw":
      return `Drew ${round}`;
    case "won":
      return score ? `Won ${round}, ${score}` : `Won ${round}`;
    case "lost":
      return score ? `Lost ${round}, ${score}` : `Lost ${round}`;
  }
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
  return last ? `${first} ${last.charAt(0)}` : first;
}

/** Vacant Positions are left out: the draw has already fixed who plays. */
export function tournamentMatchupName(side: MatchupSide | null) {
  if (!side) {
    return null;
  }
  const occupants = [side.left, side.right].filter(
    (occupant): occupant is NonNullable<Occupant> => occupant != null,
  );
  const names = occupants
    .filter((occupant) => !occupant.isViewer)
    .map((occupant) => shortPlayerName(occupant.name));
  if (sideHasViewer(side)) {
    names.unshift("You");
  }
  return names.length > 0 ? names.join(" and ") : null;
}
