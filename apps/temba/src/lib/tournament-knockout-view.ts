import { formatDayMonth, formatGameClock } from "~/lib/format-game-start";
import {
  buildKnockoutTree,
  knockoutFedBy,
  knockoutFeeds,
  knockoutMatchCode,
  knockoutQualifierLabel,
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
  | { kind: "qualifier"; label: string }
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
      winner: 1 | 2 | null;
      needsDecidingSet: boolean;
    }
  | {
      kind: "bye";
      position: number;
      code: string;
      side: KnockoutViewSide;
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
  status: string | null;
  result: "slot1" | "slot2" | "draw" | "none";
  slot1SourcePoolIndex?: number | null;
  slot1SourcePoolPosition?: number | null;
  slot2SourcePoolIndex?: number | null;
  slot2SourcePoolPosition?: number | null;
};

export const KNOCKOUT_BYE_LABEL = "Bye";
export const KNOCKOUT_DECIDING_SET_COPY = "Add a deciding Set";
export const KNOCKOUT_WON_TAG = "won";
export const KNOCKOUT_CHAMPION_TAG = "Champion";

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
        places.push({
          kind: "bye",
          position: place.position,
          code,
          side: { kind: "team", team },
        });
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
      winner: null,
      needsDecidingSet: false,
    });
  }
  return {
    round: 1,
    name: knockoutRoundName(1, tree.roundCount),
    places,
  };
}

function knockoutWinnerSlot(match: KnockoutViewMatch): 1 | 2 | null {
  if (match.status !== "completed") {
    return null;
  }
  if (match.result === "slot1") {
    return 1;
  }
  if (match.result === "slot2") {
    return 2;
  }
  return null;
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
  const sourceOf = (match: KnockoutViewMatch | undefined, slot: 1 | 2) => {
    const poolIndex =
      slot === 1 ? match?.slot1SourcePoolIndex : match?.slot2SourcePoolIndex;
    const poolPosition =
      slot === 1
        ? match?.slot1SourcePoolPosition
        : match?.slot2SourcePoolPosition;
    return poolIndex != null && poolPosition != null
      ? knockoutQualifierLabel(poolIndex, poolPosition)
      : null;
  };
  const sideFor = (
    match: KnockoutViewMatch | undefined,
    round: number,
    position: number,
    slot: 1 | 2,
  ): KnockoutViewSide => {
    const team = teamFor(
      (slot === 1 ? match?.slot1GameTeamId : match?.slot2GameTeamId) ?? null,
    );
    if (team) {
      return { kind: "team", team };
    }
    const source = sourceOf(match, slot);
    if (source) {
      return { kind: "qualifier", label: source };
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
          slot1: sideFor(match, round, position, 1),
          slot2: sideFor(match, round, position, 2),
          winner: knockoutWinnerSlot(match),
          needsDecidingSet:
            match.status !== "completed" &&
            match.status !== "cancelled" &&
            match.result === "draw",
        });
        continue;
      }
      if (round !== 1) {
        continue;
      }
      const fed = knockoutFeeds(round, position);
      const side = sideFor(
        byPlace.get(`${fed.round}:${fed.position}`),
        fed.round,
        fed.position,
        fed.slot,
      );
      if (side.kind === "team" || side.kind === "qualifier") {
        places.push({ kind: "bye", position, code, side });
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

/** The Game team that won the Final, once it is completed. */
export function knockoutChampion(
  rounds: readonly KnockoutViewRound[] | null,
): KnockoutViewTeam | null {
  const final = rounds?.at(-1)?.places[0];
  if (final?.kind !== "match" || final.winner == null) {
    return null;
  }
  const side = final.winner === 1 ? final.slot1 : final.slot2;
  return side.kind === "team" ? side.team : null;
}

/** `Champion: Ana / Bea` */
export function knockoutChampionLine(champion: KnockoutViewTeam) {
  return `${KNOCKOUT_CHAMPION_TAG}: ${champion.name}`;
}

export const KNOCKOUT_OPEN_SIDE_LABEL = "To be decided";
export const KNOCKOUT_HEADING = "Knockout";

export function knockoutSideLabel(side: KnockoutViewSide) {
  switch (side.kind) {
    case "team":
      return side.team.name;
    case "qualifier":
      return side.label;
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

export const KNOCKOUT_NOT_THROUGH_COPY =
  "Your team did not go through. The tournament is over for your team.";

function placeSides(place: KnockoutViewPlace): KnockoutViewSide[] {
  return place.kind === "match" ? [place.slot1, place.slot2] : [place.side];
}

/**
 * The viewer's Game team finished the Pool stage but was not placed in the
 * tree, once placement has put anyone in it.
 */
export function viewerMissedKnockout(args: {
  rounds: readonly KnockoutViewRound[] | null;
  poolStageFinished: boolean;
  viewerHasTeam: boolean;
}) {
  if (!args.rounds || !args.poolStageFinished || !args.viewerHasTeam) {
    return false;
  }
  const teams = args.rounds.flatMap((round) =>
    round.places.flatMap((place) =>
      placeSides(place).flatMap((side) =>
        side.kind === "team" ? [side.team] : [],
      ),
    ),
  );
  return teams.length > 0 && !teams.some((team) => team.isViewer);
}
