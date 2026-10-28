import {
  averageLevelLabel,
  balanceFootballSides,
  DEFAULT_FOOTBALL_BIBS,
  footballBibName,
  footballPositionCode,
  footballSidesProblem,
  footballSlotCode,
  keeperSeatsLeft,
  KEEPERS_PER_GAME,
  type FootballBib,
  type FootballPosition,
  type FootballRole,
  type FootballTeamsMethod,
} from "./football-lineup";
import {
  formatDayMonth,
  formatWeekday,
  formatWindowDuration,
} from "./format-game-start";
import { sideSizeLabel } from "./game-shape";
import { formatHomeKickoff } from "./home-countdown";
import {
  displayLabelFromStoredBand,
  LEVEL_BANDS,
  type LevelBand,
} from "./level-bands";

export type Side = 1 | 2;

export type BoardPlayer = {
  userId: string;
  name: string;
  image: string | null;
  role: FootballRole | null;
  position: FootballPosition | null;
  levelBand: LevelBand | null;
  sideIndex: Side | null;
  goals: number;
  isViewer: boolean;
  unclaimed?: boolean;
  phoneMasked?: string | null;
};

export type Bibs = { slot1: FootballBib; slot2: FootballBib };

export function levelLabel(band: LevelBand | null) {
  return band ? displayLabelFromStoredBand(band) : "–";
}

export function slotCode(player: Pick<BoardPlayer, "role" | "position">) {
  return footballSlotCode(player.role, player.position);
}

export function shortName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest[rest.length - 1];
  return last ? `${first} ${last.charAt(0)}` : (first ?? name);
}

/**
 * Every registration is a seat up to players allowed: substitutes register
 * like anyone else and the teams are made from everyone.
 */
export function poolLayout(
  players: readonly BoardPlayer[],
  sideSize: number | null,
  playersAllowed: number | null,
) {
  const seats = playersAllowed ?? (sideSize ?? 5) * 2;
  return {
    seats,
    pool: players,
    openSeats: Math.max(0, seats - players.length),
  };
}

export function keepersIn(players: readonly Pick<BoardPlayer, "role">[]) {
  return players.filter((player) => player.role === "keeper").length;
}

export function keeperNote(players: readonly BoardPlayer[]) {
  const first = players.find((player) => player.role === "keeper");
  const lead = `One keeper per team, so ${KEEPERS_PER_GAME} per game.`;
  return first
    ? `${lead} ${shortName(first.name)} has the first.`
    : `${lead} Nobody has claimed one yet.`;
}

export function keeperSub(players: readonly BoardPlayer[]) {
  const left = keeperSeatsLeft(keepersIn(players));
  if (left === 0) {
    return "both taken";
  }
  return left === 1 ? "1 seat left" : `${left} seats left`;
}

export function seatSummary(role: FootballRole, position: FootballPosition) {
  return role === "keeper"
    ? "Keeper"
    : `Player, prefers ${footballPositionCode(position)}`;
}

export function joinActionLabel(
  role: FootballRole,
  position: FootballPosition,
  price: string | null,
) {
  const lead =
    role === "keeper"
      ? "Join as keeper"
      : `Join as ${footballPositionCode(position)}`;
  return price && price !== "Free" ? `${lead}, ${price}` : lead;
}

export function bibNames(bibs: Bibs) {
  return {
    slot1: footballBibName(bibs.slot1, 1),
    slot2: footballBibName(bibs.slot2, 2),
  };
}

export type TeamsDraft = {
  method: FootballTeamsMethod;
  bibs: Bibs;
  sides: Record<string, Side>;
};

function sidesFromSplit(split: { slot1: string[]; slot2: string[] }) {
  const sides: Record<string, Side> = {};
  for (const userId of split.slot1) {
    sides[userId] = 1;
  }
  for (const userId of split.slot2) {
    sides[userId] = 2;
  }
  return sides;
}

export function balancedSides(
  players: readonly BoardPlayer[],
  random?: () => number,
) {
  return sidesFromSplit(
    balanceFootballSides(
      players.map((player) => ({
        userId: player.userId,
        role: player.role,
        levelBand: player.levelBand,
      })),
      random,
    ),
  );
}

/**
 * Where the Make teams screen starts: the published split when there is one,
 * otherwise a split by Level.
 */
export function initialTeamsDraft(
  players: readonly BoardPlayer[],
  teams: { method: FootballTeamsMethod | null; bibs: Bibs } | null,
): TeamsDraft {
  if (teams) {
    const sides: Record<string, Side> = {};
    for (const player of players) {
      if (player.sideIndex) {
        sides[player.userId] = player.sideIndex;
      }
    }
    return { method: teams.method ?? "manual", bibs: teams.bibs, sides };
  }
  return {
    method: "level",
    bibs: DEFAULT_FOOTBALL_BIBS,
    sides: balancedSides(players),
  };
}

export function moveAcross(draft: TeamsDraft, userId: string): TeamsDraft {
  const current = draft.sides[userId];
  if (!current) {
    return draft;
  }
  return {
    ...draft,
    sides: { ...draft.sides, [userId]: current === 1 ? 2 : 1 },
  };
}

/** Tapping a side's swatch places a player there; tapping it again unplaces. */
export function placeOn(
  draft: TeamsDraft,
  userId: string,
  side: Side,
): TeamsDraft {
  const sides = { ...draft.sides };
  if (sides[userId] === side) {
    delete sides[userId];
  } else {
    sides[userId] = side;
  }
  return { ...draft, sides };
}

/** By level and Manual start from different places: a fresh split or empty. */
export function switchMethod(
  draft: TeamsDraft,
  method: FootballTeamsMethod,
  players: readonly BoardPlayer[],
): TeamsDraft {
  if (method === draft.method) {
    return draft;
  }
  return {
    ...draft,
    method,
    sides: method === "level" ? balancedSides(players) : {},
  };
}

/** Keepers first, then strongest down: the order teams read in. */
export function byKeeperThenLevel(a: BoardPlayer, b: BoardPlayer) {
  const keeper = Number(b.role === "keeper") - Number(a.role === "keeper");
  if (keeper !== 0) {
    return keeper;
  }
  const strength = (player: BoardPlayer) =>
    player.levelBand ? LEVEL_BANDS.indexOf(player.levelBand) : -1;
  return strength(b) - strength(a);
}

export function draftSummary(
  draft: TeamsDraft,
  players: readonly BoardPlayer[],
) {
  const slot1 = players
    .filter((player) => draft.sides[player.userId] === 1)
    .sort(byKeeperThenLevel);
  const slot2 = players
    .filter((player) => draft.sides[player.userId] === 2)
    .sort(byKeeperThenLevel);
  const unplaced = players
    .filter((player) => !draft.sides[player.userId])
    .sort(byKeeperThenLevel);
  const names = bibNames(draft.bibs);
  const problem = footballSidesProblem(
    {
      slot1: slot1.map((player) => player.userId),
      slot2: slot2.map((player) => player.userId),
      unplaced: unplaced.length,
    },
    names,
  );
  const teamSize = Math.ceil(players.length / 2);
  return {
    slot1,
    slot2,
    unplaced,
    names,
    teamSize,
    problem,
    note:
      problem ??
      `Everyone placed. ${names.slot1} avg ${sideAverage(slot1)}, ${names.slot2} avg ${sideAverage(slot2)}.`,
  };
}

export function sideAverage(
  players: readonly Pick<BoardPlayer, "levelBand">[],
) {
  return averageLevelLabel(players.map((player) => player.levelBand)) ?? "–";
}

export function keeperWord(players: readonly Pick<BoardPlayer, "role">[]) {
  const count = keepersIn(players);
  return count === 1 ? "1 keeper" : `${count} keepers`;
}

export type ScoreDraft = {
  slot1: number;
  slot2: number;
  goals: Record<string, number>;
};

export function namedGoals(draft: ScoreDraft, players: readonly BoardPlayer[]) {
  const named = { slot1: 0, slot2: 0 };
  for (const player of players) {
    const goals = draft.goals[player.userId] ?? 0;
    if (player.sideIndex === 1) {
      named.slot1 += goals;
    } else if (player.sideIndex === 2) {
      named.slot2 += goals;
    }
  }
  return named;
}

/**
 * Tapping a scorer adds a goal, and raises their side's Score with it when
 * the side has no unnamed goals left.
 */
export function addGoal(
  draft: ScoreDraft,
  player: Pick<BoardPlayer, "userId" | "sideIndex">,
  players: readonly BoardPlayer[],
): ScoreDraft {
  if (!player.sideIndex) {
    return draft;
  }
  const key = player.sideIndex === 1 ? "slot1" : "slot2";
  const named = namedGoals(draft, players)[key];
  return {
    ...draft,
    [key]: Math.max(draft[key], named + 1),
    goals: {
      ...draft.goals,
      [player.userId]: (draft.goals[player.userId] ?? 0) + 1,
    },
  };
}

export function removeGoal(draft: ScoreDraft, userId: string): ScoreDraft {
  const current = draft.goals[userId] ?? 0;
  if (current === 0) {
    return draft;
  }
  const goals = { ...draft.goals };
  if (current === 1) {
    delete goals[userId];
  } else {
    goals[userId] = current - 1;
  }
  return { ...draft, goals };
}

export function scorersNote(
  draft: ScoreDraft,
  players: readonly BoardPlayer[],
  names: { slot1: string; slot2: string },
) {
  const named = namedGoals(draft, players);
  if (named.slot1 + named.slot2 === 0) {
    return "Goals count toward player form, not rating. Skip if nobody kept track.";
  }
  return `${named.slot1} of ${draft.slot1} ${names.slot1} goals and ${named.slot2} of ${draft.slot2} ${names.slot2} goals named.`;
}

export function scorersPayload(draft: ScoreDraft) {
  return Object.entries(draft.goals)
    .filter(([, goals]) => goals > 0)
    .map(([userId, goals]) => ({ userId, goals }));
}

export function confirmationLine(
  confirmed: { slot1: boolean; slot2: boolean },
  names: { slot1: string; slot2: string },
  completed: boolean,
  organizerSides: readonly { slot: Side }[] = [],
) {
  if (completed) {
    return "Both sides confirmed.";
  }
  const byOrganizer = (slot: Side) =>
    organizerSides.some((side) => side.slot === slot);
  const waitingOn = (slot: Side) => {
    const name = slot === 1 ? names.slot1 : names.slot2;
    return byOrganizer(slot)
      ? `the Organizer to confirm for ${name}`
      : `one player from ${name} to confirm`;
  };
  if (confirmed.slot1 && !confirmed.slot2) {
    return `Waiting for ${waitingOn(2)}.`;
  }
  if (confirmed.slot2 && !confirmed.slot1) {
    return `Waiting for ${waitingOn(1)}.`;
  }
  if (byOrganizer(1) && byOrganizer(2)) {
    return "Waiting for the Organizer to confirm for both sides.";
  }
  if (byOrganizer(1) || byOrganizer(2)) {
    return `Waiting for ${waitingOn(1)} and ${waitingOn(2)}.`;
  }
  return "Waiting for one player from each side to confirm.";
}

export function confirmForSideLabel(
  slot: Side,
  names: { slot1: string; slot2: string },
) {
  return `Confirm for ${slot === 1 ? names.slot1 : names.slot2}`;
}

export function viewerSideLine(
  viewer: { sideIndex: Side | null },
  players: readonly BoardPlayer[],
  names: { slot1: string; slot2: string },
) {
  if (!viewer.sideIndex) {
    return null;
  }
  const you = players.find((player) => player.isViewer);
  const code = you ? slotCode(you) : null;
  const team = viewer.sideIndex === 1 ? names.slot1 : names.slot2;
  return code ? `You play in ${team} as ${code}.` : `You play in ${team}.`;
}

export type HeroLinesInput = {
  windowStart: Date | null;
  windowEnd: Date | null;
  cancelledAt: Date | null;
  sideSize: number | null;
  venueName: string | null;
  pitchName: string | null;
  teamsSet: boolean;
  scored: boolean;
};

/** The words around the kick-off time at the top of a football Game. */
export function footballHeroLines(input: HeroLinesInput, now: Date) {
  const start = input.windowStart;
  const played =
    input.windowEnd != null && input.windowEnd.getTime() < now.getTime();
  const weekday = start ? formatWeekday(start, "long") : null;
  const status = input.cancelledAt
    ? "Cancelled"
    : played
      ? input.scored
        ? "Played"
        : "Played, score missing"
      : input.teamsSet
        ? `Teams set${weekday ? `, ${weekday}` : ""}`
        : `Upcoming${weekday ? `, ${weekday}` : ""}`;
  const kickoff = start ? formatHomeKickoff(start) : null;
  const day = start ? formatDayMonth(start, { weekday: "short" }) : null;
  const duration = formatWindowDuration(input.windowStart, input.windowEnd);
  return {
    status,
    sizeTag: input.sideSize
      ? sideSizeLabel(input.sideSize).toUpperCase()
      : null,
    time: kickoff?.time ?? null,
    meridiem: kickoff?.meridiem ?? null,
    dayLine: [day, input.venueName].filter(Boolean).join(", ") || null,
    subLine: [input.pitchName, duration].filter(Boolean).join(", ") || null,
  };
}
