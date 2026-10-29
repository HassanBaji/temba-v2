import { sportLabel, type PublicGroupSportFilter } from "./sport";

export const MY_GROUPS_EMPTY_TITLE = "No Groups yet";

export const MY_GROUPS_EMPTY_COPY =
  "Choose padel or football, invite players, and Temba keeps the Standing and history.";

/** The hatched Group row the Mine tab draws before the first Group. */
export const MY_GROUPS_PLACEHOLDER_TITLE = "Your first Group";

export const PUBLIC_GROUPS_EMPTY_TITLE = "No public Groups to join right now";

/** The Public placeholder draws this many hatched Group monograms. */
export const PUBLIC_GROUPS_PREVIEW_MONOGRAMS = 3;

export function publicGroupsEmptyLine(filter: PublicGroupSportFilter) {
  const sport = filter === "all" ? null : sportLabel(filter);
  const groups = sport ? `Public ${sport} Groups` : "Public Groups";
  return `${groups} show up here. Start one and players can find it.`;
}
