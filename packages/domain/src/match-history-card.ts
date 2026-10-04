import { formatRelativeDay } from "./format-game-start";
import { shortPlayerName } from "./player-name";

export type HistoryMember = {
  id: string;
  name: string;
  image: string | null;
  isViewer: boolean;
};

export type HistoryRowInput = {
  name: string | null;
  groupName: string | null;
  venue: { name: string };
  displayTime: Date;
  slot1Members: HistoryMember[];
  slot2Members: HistoryMember[];
  scoredSets: { slot1GamesWon: number; slot2GamesWon: number }[];
  viewerSlot: 1 | 2;
  outcome: "won" | "lost" | "draw";
};

export const HISTORY_PAGE_SIZE = 20;

export const PENDING_SET_COLUMNS = 3;

export function nextHistoryCursor(
  lastPage: readonly { displayTime: Date; matchId: string }[],
): { displayTime: Date; matchId: string } | undefined {
  const last = lastPage.at(-1);
  if (!last || lastPage.length < HISTORY_PAGE_SIZE) {
    return undefined;
  }
  return { displayTime: last.displayTime, matchId: last.matchId };
}

/** Set scores read as us-vs-them off the slot the viewer actually sat on. */
export function viewerSets(row: HistoryRowInput) {
  return row.scoredSets.map((set) =>
    row.viewerSlot === 1
      ? { us: set.slot1GamesWon, them: set.slot2GamesWon }
      : { us: set.slot2GamesWon, them: set.slot1GamesWon },
  );
}

export function setTally(sets: { us: number; them: number }[]) {
  let won = 0;
  let lost = 0;
  for (const set of sets) {
    if (set.us > set.them) {
      won += 1;
    } else if (set.us < set.them) {
      lost += 1;
    }
  }
  return { won, lost };
}

/** The viewer reads as "You", and leads their own team's seats and label. */
export function viewerFirst<T extends { isViewer: boolean }>(members: T[]) {
  const index = members.findIndex((member) => member.isViewer);
  if (index <= 0) {
    return members;
  }
  return [members[index]!, ...members.filter((_, at) => at !== index)];
}

export function historyTeamLabel(members: HistoryMember[]) {
  const names = members.map((member) =>
    member.isViewer ? "You" : shortPlayerName(member.name),
  );
  if (names.length === 0) {
    return "Open seats";
  }
  if (names.length === 1) {
    return names[0]!;
  }
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]!}`;
}

export function historyMeta(row: HistoryRowInput) {
  const dayLabel = formatRelativeDay(row.displayTime, {
    sameDayLabel: "Today",
  });
  const venueName = row.venue.name.trim();
  const gameName = row.name?.trim();
  return gameName && gameName !== venueName
    ? `${dayLabel}, ${venueName} · ${gameName}`
    : `${dayLabel}, ${venueName}`;
}

export type HistoryTeamRow = {
  side: "mine" | "theirs";
  members: HistoryMember[];
  seats: number;
  label: string;
  note: string;
  scores: { games: number; wonSet: boolean }[] | null;
  filled: boolean;
  outlined: boolean;
};

export type MatchHistoryCardModel = {
  outcome: "won" | "lost" | "draw";
  scored: boolean;
  setColumns: number;
  tally: { won: number; lost: number };
  meta: string;
  groupName: string | undefined;
  teams: HistoryTeamRow[];
};

/** Winners carry the ink fill; the viewer's losing side carries the outline; the loser reads first. */
export function matchHistoryCardModel(
  row: HistoryRowInput,
): MatchHistoryCardModel {
  const sets = viewerSets(row);
  const scored = sets.length > 0;
  const won = row.outcome === "won";
  const lost = row.outcome === "lost";

  const myMembers = viewerFirst(
    row.viewerSlot === 1 ? row.slot1Members : row.slot2Members,
  );
  const opponents = row.viewerSlot === 1 ? row.slot2Members : row.slot1Members;
  const seats = Math.max(myMembers.length, opponents.length, 1);

  const mine: HistoryTeamRow = {
    side: "mine",
    members: myMembers,
    seats,
    label: historyTeamLabel(myMembers),
    note: won ? "Your team, winners" : lost ? "Your team, lost" : "Your team",
    scores: scored
      ? sets.map((set) => ({ games: set.us, wonSet: set.us > set.them }))
      : null,
    filled: won,
    outlined: !won,
  };
  const theirs: HistoryTeamRow = {
    side: "theirs",
    members: opponents,
    seats,
    label: historyTeamLabel(opponents),
    note: won ? "Lost" : lost ? "Winners" : "Other team",
    scores: scored
      ? sets.map((set) => ({ games: set.them, wonSet: set.them > set.us }))
      : null,
    filled: lost,
    outlined: false,
  };

  return {
    outcome: row.outcome,
    scored,
    setColumns: sets.length,
    tally: setTally(sets),
    meta: historyMeta(row),
    groupName: row.groupName?.trim() ? row.groupName.trim() : undefined,
    teams: lost ? [theirs, mine] : [mine, theirs],
  };
}
