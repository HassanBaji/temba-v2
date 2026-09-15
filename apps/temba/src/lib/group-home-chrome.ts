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

export function groupHomeMemberGamesLabel(totalGamesPlayed: number) {
  return `${totalGamesPlayed} Games`;
}

export function groupHomeVenueCourtLine(
  venueName: string | null | undefined,
  courtName: string | null | undefined,
) {
  if (venueName && courtName) {
    return `${venueName} · ${courtName}`;
  }
  return venueName ?? courtName ?? null;
}

export function groupHomeSetScoreLine(
  sets:
    | readonly {
        slot1GamesWon: number | null;
        slot2GamesWon: number | null;
      }[]
    | null
    | undefined,
) {
  if (!sets) {
    return null;
  }
  const scored = sets.filter(
    (set) => set.slot1GamesWon != null && set.slot2GamesWon != null,
  );
  if (scored.length === 0) {
    return null;
  }
  return scored
    .map((set) => `${set.slot1GamesWon}-${set.slot2GamesWon}`)
    .join(", ");
}
