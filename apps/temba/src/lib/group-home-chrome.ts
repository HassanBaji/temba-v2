import { shortPlayerName } from "~/lib/player-name";

const SPORT_LABELS: Record<string, string> = {
  padel: "Padel",
  football: "Football",
};

export function groupHomeSportLabel(sport: string | null | undefined) {
  const value = sport?.trim();
  if (!value) {
    return null;
  }
  return SPORT_LABELS[value] ?? value;
}

function seasonSinceMonth(createdAt: Date | string | null | undefined) {
  if (createdAt == null) {
    return null;
  }
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString("en-US", { month: "short" });
}

/**
 * The Group home header meta line: `"{Sport}, {n} members, season since {Mon}"`.
 *
 * Parts with no value are dropped and the remainder joined with `", "`, so a
 * Group with no sport reads `"14 members, season since Jan"`. Returns an empty
 * string when nothing is known; the header renders no meta line then.
 */
export function groupHomeMetaLine(input: {
  sport: string | null | undefined;
  memberCount: number | null | undefined;
  createdAt: Date | string | null | undefined;
}) {
  const parts: string[] = [];

  const sport = groupHomeSportLabel(input.sport);
  if (sport) {
    parts.push(sport);
  }

  const memberCount = input.memberCount;
  if (memberCount != null && Number.isFinite(memberCount)) {
    parts.push(memberCount === 1 ? "1 member" : `${memberCount} members`);
  }

  const since = seasonSinceMonth(input.createdAt);
  if (since) {
    parts.push(`season since ${since}`);
  }

  return parts.join(", ");
}

export function groupHomeHasStandingResults(
  members: readonly {
    totalSetsWon: number;
    totalPointsWon: number;
    totalGamesPlayed: number;
  }[],
) {
  return members.some(
    (member) =>
      member.totalSetsWon > 0 ||
      member.totalPointsWon > 0 ||
      member.totalGamesPlayed > 0,
  );
}

export function groupHomeShowsMemberSearch(memberCount: number) {
  return memberCount > 8;
}

export function filterGroupMembersByName<T extends { name: string }>(
  members: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [...members];
  }
  return members.filter((member) => member.name.toLowerCase().includes(needle));
}

/**
 * The Members tab role/tenure caption: **Organizer** for the Group creator
 * and — on a Club Group — a Community staff member (spec D8), otherwise
 * `"Member since {Mon}"` from the `group_members` join date. Returns `null`
 * when neither is known, so the row renders the name alone rather than an
 * empty caption.
 */
export function groupMemberRoleCaption(member: {
  isOrganizer: boolean;
  joinedAt: Date | string | null | undefined;
}) {
  if (member.isOrganizer) {
    return "Organizer";
  }
  const since = seasonSinceMonth(member.joinedAt);
  return since ? `Member since ${since}` : null;
}

/** The Standing W-L column: `{wins}-{losses}`, drawn even at `0-0`. */
export function groupStandingRecordLabel(wins: number, losses: number) {
  return `${wins}-${losses}`;
}

/**
 * The Games tab Played row (design 06b): a team label such as `"You, Sofia L"`,
 * the viewer first so the row opens with their own seat. An empty slot — a
 * past Game whose draw never happened — reads as open seats, matching the
 * Games hub History card.
 */
export function groupPlayedTeamLabel(
  members: readonly { name: string; isViewer: boolean }[],
) {
  const ordered = [...members].sort((left, right) => {
    if (left.isViewer === right.isViewer) {
      return 0;
    }
    return left.isViewer ? -1 : 1;
  });
  const names = ordered.map((member) =>
    member.isViewer ? "You" : shortPlayerName(member.name),
  );
  return names.length > 0 ? names.join(", ") : "Open seats";
}

/** `"6 Sep"` — the Played row's date, day before month as the design draws it. */
export function groupPlayedDayLabel(playedAt: Date | string) {
  const date = playedAt instanceof Date ? playedAt : new Date(playedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  // Composed rather than locale-formatted: `en-GB` reads "6 Sept" and `en-US`
  // reverses the order. Same composition `formatGameCardDay` uses.
  return `${date.getDate()} ${date.toLocaleDateString("en-US", { month: "short" })}`;
}

/** The Played row's second line: the other team, then the date. */
export function groupPlayedOpponentLine(
  members: readonly { name: string; isViewer: boolean }[],
  playedAt: Date | string,
) {
  const day = groupPlayedDayLabel(playedAt);
  const label = groupPlayedTeamLabel(members);
  return day ? `${label}, ${day}` : label;
}

/**
 * The Played row scoreline, read from the slot the viewer sat on so their own
 * games come first: `"6-4 4-6 7-5"`. A Game they did not play in reads from
 * slot 1. `null` when the Match carries no scored Set — the row draws the
 * **Enter** affordance instead.
 */
export function groupPlayedScoreLine(
  scoredSets: readonly { slot1GamesWon: number; slot2GamesWon: number }[],
  viewerSlot: 1 | 2 | null,
) {
  if (scoredSets.length === 0) {
    return null;
  }
  return scoredSets
    .map((set) =>
      viewerSlot === 2
        ? `${set.slot2GamesWon}-${set.slot1GamesWon}`
        : `${set.slot1GamesWon}-${set.slot2GamesWon}`,
    )
    .join(" ");
}

/**
 * The Played row's result mark. A draw, a Match still awaiting a score, and a
 * Game the viewer did not play in all read `not-played` — the design draws
 * three marks, the same rule `groupFormMarks` applies.
 */
export function groupPlayedMarkVariant(
  outcome: "won" | "lost" | "draw" | null,
): "won" | "lost" | "not-played" {
  if (outcome === "won" || outcome === "lost") {
    return outcome;
  }
  return "not-played";
}
