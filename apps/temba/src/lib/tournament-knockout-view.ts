import { formatDayMonth, formatGameClock } from "~/lib/format-game-start";
import {
  buildKnockoutTree,
  knockoutFedBy,
  knockoutFeeds,
  knockoutMatchCode,
  knockoutRoundName,
  knockoutWinnerOfLabel,
} from "~/lib/tournament-knockout";

export type KnockoutViewTeam = {
  gameTeamId: string;
  name: string;
  isViewer: boolean;
};

export type KnockoutViewSide =
  | { kind: "team"; team: KnockoutViewTeam }
  | { kind: "winner_of"; label: string }
  | { kind: "open" };

export type KnockoutViewPlace =
  | {
      kind: "match";
      matchId: string | null;
      position: number;
      code: string;
      startTime: Date | string | null;
      courtName: string | null;
      slot1: KnockoutViewSide;
      slot2: KnockoutViewSide;
    }
  | {
      kind: "bye";
      position: number;
      code: string;
      team: KnockoutViewTeam;
    };

export type KnockoutViewRound = {
  round: number;
  name: string;
  places: KnockoutViewPlace[];
};

export type KnockoutViewGameTeam = {
  id: string;
  name: string | null;
  knockoutSeed?: number | null;
  members: readonly { id: string; name: string }[];
};

export type KnockoutViewMatch = {
  id: string;
  knockoutRound: number | null;
  knockoutPosition: number | null;
  startTime: Date | string | null;
  courtName: string | null;
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
};

export const KNOCKOUT_BYE_LABEL = "Bye";

function gameTeamName(team: KnockoutViewGameTeam) {
  if (team.members.length > 0) {
    return team.members.map((member) => member.name).join(" / ");
  }
  return team.name ?? "Game team";
}

function viewTeam(
  team: KnockoutViewGameTeam,
  viewerUserId: string,
): KnockoutViewTeam {
  return {
    gameTeamId: team.id,
    name: gameTeamName(team),
    isViewer: team.members.some((member) => member.id === viewerUserId),
  };
}

export function hasDraftKnockoutDraw(
  gameTeams: readonly { knockoutSeed?: number | null }[],
) {
  return gameTeams.some((team) => team.knockoutSeed != null);
}

/** The drafted first Knockout round: pairings and Byes, before posting. */
export function draftKnockoutFirstRound(args: {
  gameTeams: readonly KnockoutViewGameTeam[];
  viewerUserId: string;
}): KnockoutViewRound | null {
  const drawnOrder = args.gameTeams
    .filter((team) => team.knockoutSeed != null)
    .sort(
      (left, right) =>
        (left.knockoutSeed ?? 0) - (right.knockoutSeed ?? 0) ||
        left.id.localeCompare(right.id),
    );
  const tree = buildKnockoutTree({ entrantCount: drawnOrder.length });
  if (!tree) {
    return null;
  }

  const entrant = (order: number) => {
    const team = drawnOrder[order - 1];
    return team ? viewTeam(team, args.viewerUserId) : null;
  };
  const places: KnockoutViewPlace[] = [];
  for (const place of tree.firstRound) {
    const code = knockoutMatchCode(1, place.position, tree.roundCount);
    if (place.kind === "bye") {
      const team = entrant(place.entrant);
      if (team) {
        places.push({ kind: "bye", position: place.position, code, team });
      }
      continue;
    }
    const slot1 = entrant(place.slot1Entrant);
    const slot2 = entrant(place.slot2Entrant);
    places.push({
      kind: "match",
      matchId: null,
      position: place.position,
      code,
      startTime: null,
      courtName: null,
      slot1: slot1 ? { kind: "team", team: slot1 } : { kind: "open" },
      slot2: slot2 ? { kind: "team", team: slot2 } : { kind: "open" },
    });
  }
  return {
    round: 1,
    name: knockoutRoundName(1, tree.roundCount),
    places,
  };
}

/** The posted tree, read from its Knockout Matches. Null without any. */
export function postedKnockoutRounds(args: {
  matches: readonly KnockoutViewMatch[];
  gameTeams: readonly KnockoutViewGameTeam[];
  viewerUserId: string;
}): KnockoutViewRound[] | null {
  const byPlace = new Map<string, KnockoutViewMatch>();
  let roundCount = 0;
  for (const match of args.matches) {
    if (match.knockoutRound == null || match.knockoutPosition == null) {
      continue;
    }
    byPlace.set(`${match.knockoutRound}:${match.knockoutPosition}`, match);
    roundCount = Math.max(roundCount, match.knockoutRound);
  }
  if (roundCount === 0) {
    return null;
  }

  const teamsById = new Map(args.gameTeams.map((team) => [team.id, team]));
  const teamFor = (gameTeamId: string | null) => {
    const team = gameTeamId ? teamsById.get(gameTeamId) : undefined;
    return team ? viewTeam(team, args.viewerUserId) : null;
  };
  const sideFor = (
    round: number,
    position: number,
    slot: 1 | 2,
    gameTeamId: string | null,
  ): KnockoutViewSide => {
    const team = teamFor(gameTeamId);
    if (team) {
      return { kind: "team", team };
    }
    const fedBy = knockoutFedBy(round, position, slot);
    if (fedBy && byPlace.has(`${fedBy.round}:${fedBy.position}`)) {
      return {
        kind: "winner_of",
        label: knockoutWinnerOfLabel(
          knockoutMatchCode(fedBy.round, fedBy.position, roundCount),
        ),
      };
    }
    return { kind: "open" };
  };

  const rounds: KnockoutViewRound[] = [];
  for (let round = 1; round <= roundCount; round += 1) {
    const places: KnockoutViewPlace[] = [];
    const positions = 2 ** (roundCount - round);
    for (let position = 1; position <= positions; position += 1) {
      const code = knockoutMatchCode(round, position, roundCount);
      const match = byPlace.get(`${round}:${position}`);
      if (match) {
        places.push({
          kind: "match",
          matchId: match.id,
          position,
          code,
          startTime: match.startTime,
          courtName: match.courtName,
          slot1: sideFor(round, position, 1, match.slot1GameTeamId),
          slot2: sideFor(round, position, 2, match.slot2GameTeamId),
        });
        continue;
      }
      if (round !== 1) {
        continue;
      }
      const fed = knockoutFeeds(round, position);
      const next = byPlace.get(`${fed.round}:${fed.position}`);
      const team = teamFor(
        (fed.slot === 1 ? next?.slot1GameTeamId : next?.slot2GameTeamId) ??
          null,
      );
      if (team) {
        places.push({ kind: "bye", position, code, team });
      }
    }
    rounds.push({
      round,
      name: knockoutRoundName(round, roundCount),
      places,
    });
  }
  return rounds;
}

export const KNOCKOUT_OPEN_SIDE_LABEL = "To be decided";
export const KNOCKOUT_HEADING = "Knockout";

export function knockoutSideLabel(side: KnockoutViewSide) {
  switch (side.kind) {
    case "team":
      return side.team.name;
    case "winner_of":
      return side.label;
    case "open":
      return KNOCKOUT_OPEN_SIDE_LABEL;
  }
}

/** `9:00 AM, Court 1` */
export function knockoutPlaceMetaLine(
  startTime: Date | string | null,
  courtName: string | null,
) {
  const parts = [
    startTime ? formatGameClock(startTime) : null,
    courtName,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : null;
}

/** `Sat 27 Sep`, from the round's earliest Match. */
export function knockoutRoundDayLine(round: KnockoutViewRound) {
  let earliest: Date | null = null;
  for (const place of round.places) {
    if (place.kind !== "match" || !place.startTime) {
      continue;
    }
    const start =
      place.startTime instanceof Date
        ? place.startTime
        : new Date(place.startTime);
    if (!earliest || start.getTime() < earliest.getTime()) {
      earliest = start;
    }
  }
  return earliest ? formatDayMonth(earliest, { weekday: "short" }) : null;
}
